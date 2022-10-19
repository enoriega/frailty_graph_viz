import React from 'react';
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import smoothHull from '../../utils/convexHull';


import "../styles/MainGraph.scss";
import WeightPanel from '../weight/WeightPanel';
import SidePanel from "./SidePanel";
import EvidencePanelWrapper from './EvidencePanelWrapper';
import { idToClass, calculateCategoryCenters, calculateCategoryCentersEllipse, normalizeDistance, categoryNodeColors, categoryHullColors, createLine, createArc } from '../../utils/utils';
import BlobLegends from './BlobLegends';
import NodeDetail from './NodeDetail';

const ALPHA_TARGET = 0.1;
const ALPHA_MINVAL = -1;
const ALPHA_INIT = 1;

// These are the initially assumed height. After rendering the html, these height and width will be updated.
const ASPECT_RATIO = 16/9;
const minHeight = 300;
const minWidth = 300;
let height = minHeight;
let width = height*ASPECT_RATIO;

// values for all forces
// https://www.youtube.com/watch?v=JAe7Oscsp98
const forceProperties = {
    center: {
        enabled: false,
        x: 0.5,
        y: 0.5,
        strength: 0.1
    },
    charge: {
        enabled: true,
        strength: -500,
        distanceMin: 1,
        distanceMax: 1000
    },
    collide: {
        enabled: true,
        strength: .4,
        iterations: 1,
        radius: 30
    },
    separation: {
        enabled: true,
        strength: 0.1,
        radius: (width + height) / 2.0 * 0.2,
        radiusFunc: (width, height) => (width + height) / 2.0 * 0.2
    },
    link: {
        enabled: false,
        strength: 0.9,
        iterations: 1,
        distanceFactor: 5
    }
};

const influenceLinkColors = [
    { id:"Pos", value: "#4bb543"},
    { id:"Neu", value: "grey"},
    { id:"Neg", value: "#ff8484"},
];

const influenceNodeColors = [
    { id:"Pos", value: "#5cc654"},
    { id:"Neu", value: "lightgrey"},
    { id:"Neg", value: "#ff9595"},
];


const updateForces = ({ simulation, maxLinkDist, categoriesDetailsLength, restart }) => {
    simulation.stop();
    // get each force by name and update the properties
    simulation.force("center")
        // @ts-ignore
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y)
        .strength(forceProperties.center.enabled ? forceProperties.center.strength : 0);
    simulation.force("charge")
        // @ts-ignore
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);
    simulation.force("collide")
        // @ts-ignore
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations);

    const cat_centers = calculateCategoryCenters(categoriesDetailsLength, forceProperties.separation.radius, width, height)
    simulation.force("forceX")
        // @ts-ignore
        .strength(forceProperties.separation.strength * forceProperties.separation.enabled)
        .x(d => cat_centers[d['category'] - 1][0]);
    simulation.force("forceY")
        // @ts-ignore
        .strength(forceProperties.separation.strength * forceProperties.separation.enabled)
        .y(d => cat_centers[d['category'] - 1][1]);

    simulation.force("link")
        // @ts-ignore
        .distance(d => normalizeDistance(d.freq, 1, maxLinkDist, 1, 50) * forceProperties.link.distanceFactor)
        .iterations(forceProperties.link.iterations)
        // @ts-ignore
        .strength(forceProperties.link.enabled ? simulation.force("link").strength() : 0);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(ALPHA_INIT).alphaMin(ALPHA_MINVAL);
    if(restart) simulation.restart();
}


const MainGraph = ({ apiUrls, defaultEntities }) => {
    const categoryCount = {};
    if("category_count" in defaultEntities) {
        categoryCount["category_count"] = {
            categorycount: defaultEntities.category_count.categorycount
        };
    }
    else {
        categoryCount["category_count"] = {categorycount:{}}
    }
    
    defaultEntities = {
        ...categoryCount,
        nodes: {...defaultEntities.nodes},
    }

    console.log("Module Loading");

    let setBlobLegendsColors = null;
    let setSidePanelCategoryDetails = null;

    const initialPinnedNodes = [];
    for(let i = 0; i < defaultEntities.nodes.nodes.length; i++) {
        initialPinnedNodes.push({
            id: defaultEntities.nodes.nodes[i],
            label: defaultEntities.nodes.labels[i],
            category: defaultEntities.nodes.categories[i]
        });
    }

    const svgRef = React.useRef();
    let maxLinkDist = 100;

    let selectedNode = {
        category_count: defaultEntities.category_count,
        nodes: { nodes: defaultEntities.nodes.nodes }
    };
    const setSelectedNode = (d) => {
        selectedNode = d;
        d3UpdateFunc();
    };
    const updateSelectedNode = (d) => {
        setSelectedNode({
            ...selectedNode,
            nodes: { nodes: d }
        });
    };

    const simulation = d3.forceSimulation();

    simulation.stop()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());

    const cleanUp = () => {
        simulation.stop();
        relationViewSimulation.stop();
        console.log('Clean up');
        d3.select('g.hullgroup').html("");
        d3.select('g.linkgroup').html("");
        d3.select('g.nodegroup').html("");
        d3.select('g.relationlinks').html("");
        d3.select('g.relationnodes').html("");
    };

    const subgraph = {
        nodes: [], links: []
    };

    const nodeRadiusScale = {
        'linear': d3.scaleLinear().range([1, 30]),
        'log': d3.scaleLog().range([1, 30])
    }
    let selectedNodeRadiusScale = 'linear';


    let setBlobLegendNodeRadiusScale = null;

    const nodeRadiusScaleChanged = (val) => {
        selectedNodeRadiusScale = val;
        setBlobLegendNodeRadiusScale(nodeRadiusScale[selectedNodeRadiusScale], selectedNodeRadiusScale);
        d3UpdateFunc();
    }

    const nodeWeightParams = {
        frequency: 1,
        hasSignificance: 1,
        avgSignificance: 1,
        avgImpactFactor: 1,
        maxImpactFactor: 1,
        pValue: 1,
    }

    let setShowRelationViewLegends = null;

    const weightUpdated = async () => {
        if (Object.keys(nodeWeightParams).length === 0) return;
        const nodeWeightsResponse = await fetch(`${apiUrls.viz}/noderadius`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nodes: {
                    nodes: subgraph.nodes.map(d => d.id)
                },
                weights: {
                    weights: nodeWeightParams
                }
            })
        });
        const nodeWeights = await nodeWeightsResponse.json();

        const nodeWeightMin = Math.min(...Object.values(nodeWeights));
        const nodeWeightMax = Math.max(...Object.values(nodeWeights));
        nodeRadiusScale[selectedNodeRadiusScale].domain([nodeWeightMin, nodeWeightMax]);

        setBlobLegendNodeRadiusScale(nodeRadiusScale[selectedNodeRadiusScale], selectedNodeRadiusScale);

        for (let i = 0; i < subgraph.nodes.length; i++) {
            subgraph.nodes[i]['weight_radius'] = +nodeWeights[subgraph.nodes[i].id];
        }
        d3.select("g.nodegroup").selectAll("circle")
            .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius));
    }
    const weightChanged = async (weight) => {
        Object.assign(nodeWeightParams, weight);
        await weightUpdated();
    }
    let nodeSelection = {
        first: null
    };

    const processCytoscapeGraph = (graph) => {
        const nodes = graph.filter(d => !d.data.hasOwnProperty('source')).map(d => d.data);
        const links = graph.filter(d => d.data.hasOwnProperty('source')).map(d => d.data);

        return {
            nodes: subgraph.nodes.filter(node => nodes.map(d => d.id).includes(node.id)),
            links: links
        };
    }

    let setDetailNodeLegend = null;

    const getSankeyGraph = (graph, node1, node2) => {
        const nodes = [{id:node1}, {id:node2}];
        graph.links.forEach(link => {
            if(link.source === node1 && link.target === node2) {
                if(link.polarity === "Positive")
                    nodes.push({...link, id: "rightPos"})
                else if(link.polarity === "Neutral")
                    nodes.push({...link, id: "rightNeu"})
                else if(link.polarity === "Negative")
                    nodes.push({...link, id: "rightNeg"})
            }
            else if(link.source === node2 && link.target === node1) {
                if(link.polarity === "Positive")
                    nodes.push({...link, id: "leftPos"})
                else if(link.polarity === "Neutral")
                    nodes.push({...link, id: "leftNeu"})
                else if(link.polarity === "Negative")
                    nodes.push({...link, id: "leftNeg"})
            }
        })
        const edges = graph.links.filter(d => !d.id.startsWith("cluster_")).map(edge => {
            const valueAccessor = (d) => d.freq;
            if(edge.source === node1) {
                if(edge.polarity === "Negative") {
                    return [
                        { source:node1, target:"rightNeg", value:valueAccessor(edge) },
                        { source:"rightNeg", target:node2, value:valueAccessor(edge) },
                    ]
                }
                else if(edge.polarity === "Neutral") {
                    return [
                        { source:node1, target:"rightNeu", value:valueAccessor(edge) },
                        { source:"rightNeu", target:node2, value:valueAccessor(edge) },
                    ]
                }
                else if(edge.polarity === "Positive") {
                    return [
                        { source:node1, target:"rightPos", value:valueAccessor(edge) },
                        { source:"rightPos", target:node2, value:valueAccessor(edge) },
                    ]
                }
            }
            else if(edge.source === node2) {
                if(edge.polarity === "Negative") {
                    return [
                        { source:node1, target:"leftNeg", value:valueAccessor(edge) },
                        { source:"leftNeg", target:node2, value:valueAccessor(edge) },
                    ]
                }
                else if(edge.polarity === "Neutral") {
                    return [
                        { source:node1, target:"leftNeu", value:valueAccessor(edge) },
                        { source:"leftNeu", target:node2, value:valueAccessor(edge) },
                    ]
                }
                else if(edge.polarity === "Positive") {
                    return [
                        { source:node1, target:"leftPos", value:valueAccessor(edge) },
                        { source:"leftPos", target:node2, value:valueAccessor(edge) },
                    ]
                }
            }
        }).flat();
        return { nodes: nodes, links: edges };
    };

    const currentView = {
        "view": "root"
    }

    const relationViewSimulation = d3.forceSimulation();
    relationViewSimulation.stop()
        .force("link", d3.forceLink().id(d => d.id).strength(0))
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());
        

    let setEvidenceData = null;
    let setNodeDetailColors = null;


    const d3UpdateFunc = async () => {
        // This is not actually an effect, but it works like an effect as it is run after component is mounted and rendered.
        console.log("effect called");
        simulation.stop();
        if (selectedNode.nodes.nodes.length === 0) {
            console.log("reseting nodes");
            setSelectedNode(defaultEntities);
            return;
        }

        const svgRoot = d3.select(svgRef.current);
        const svg = d3.select(svgRef.current).select("g.everything");
        const svgHullGroup = svg.select('g.hullgroup');
        const svgLinkGroup = svg.select('g.linkgroup');
        const svgNodeGroup = svg.select('g.nodegroup');


        height = Math.max(parseInt(svgRoot.style("height")), minHeight);
        width = Math.max(parseInt(svgRoot.style("width")), minWidth);
        forceProperties.separation.radius = forceProperties.separation.radiusFunc(width, height);

        const categoriesDetailsResponse = await fetch(`${apiUrls.viz}/categories`)
        const categoriesDetails = await categoriesDetailsResponse.json();

        const BlobLegendsColors = Object.entries(categoriesDetails).map(([k, v]) => ({
            id: v,
            color: categoryNodeColors[k],
            encoding: k
        }));;
        setBlobLegendsColors(BlobLegendsColors);
        setNodeDetailColors(BlobLegendsColors);
        setSidePanelCategoryDetails(BlobLegendsColors);


        const initialDefaultCategoryCount = 5;
        for(const cat in categoriesDetails) {
            if(!(cat in selectedNode.category_count.categorycount)) {
                selectedNode.category_count.categorycount[cat] = initialDefaultCategoryCount;
            }
        }

        const categoriesDetailsLength = Object.keys(categoriesDetails).length;

        svgHullGroup
            .selectAll('path')
            .data(Object.keys(categoriesDetails).map(key => ({ category: key })), d => d.category)
            .enter()
            .append('path')
            .attr('class', d => 'hull_' + (d.category))
            .style('fill', d => categoryHullColors[d.category]);

        const newSubgraphResponse = await fetch(`${apiUrls.viz}/getbestsubgraph`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedNode)
        });
        const newSubgraph = await newSubgraphResponse.json();

        const newNodes = [];
        const newLinks = [];
        for (let i in newSubgraph.nodes) {
            const myNode = subgraph.nodes.findIndex(node => node.id === newSubgraph.nodes[i].id)
            if (myNode !== -1) {
                newNodes.push({
                    ...subgraph.nodes[myNode],
                    ...newSubgraph.nodes[i]
                });
            }
            else {
                newNodes.push({
                    ...newSubgraph.nodes[i],
                    x: width / 2,
                    y: height / 2,
                });
            }
        }
        for (let i in newSubgraph.links) {
            const myEdge = subgraph.links.findIndex(edge => edge.source.id === newSubgraph.links[i].source && edge.target.id === newSubgraph.links[i].target)
            if (myEdge !== -1) {
                newLinks.push({
                    ...subgraph.links[myEdge],
                    ...newSubgraph.links[i]
                });
            }
            else {
                newLinks.push(newSubgraph.links[i]);
            }
        }
        subgraph.nodes = newNodes;
        subgraph.links = newLinks;

        await weightUpdated();

        const link = svgLinkGroup
            .selectAll('g.line')
            .data(subgraph.links, d => d.source + d.target)
            .join(
                enter => {
                    const lineGroup = enter
                        .append('g')
                        .attr('class', d => "line " + idToClass(d.source) + " " + idToClass(d.target))
                        .classed('betweencategory', d => d['samecategory'])
                        .classed('intracategory', d => !d['samecategory']);
                    lineGroup.append("text")
                        .text(d => d.freq);
                    lineGroup.append("path")
                        .attr('fill', 'none')
                        .on('mouseover', (e) => {
                            if(currentView.view !== "root") return;
                            if(nodeSelection.first) return;
                            const line = d3.select(e.target.parentNode).classed('hovered', true);
                            const lineData = line.data();
                            d3.selectAll(`g#${idToClass(lineData[0].source.id)} circle`).classed('hovered', true);
                            d3.selectAll(`g#${idToClass(lineData[0].target.id)} circle`).classed('hovered', true);
                        })
                        .on('mouseout', (e) => {
                            if(currentView.view !== "root") return;
                            if(nodeSelection.first) return;
                            const line = d3.select(e.target.parentNode).classed('hovered', false);
                            const lineData = line.data();
                            d3.selectAll(`g#${idToClass(lineData[0].source.id)} circle`).classed('hovered', false);
                            d3.selectAll(`g#${idToClass(lineData[0].target.id)} circle`).classed('hovered', false);
                        })
                        .on('click', (e) => {
                            if(currentView.view !== "root") return;
                            nodeSelection.first = null;
                            const line = d3.select(e.target.parentNode);
                            const lineData = line.data();
                            if(nodeSelection.first !== null && nodeSelection.first !== lineData[0].source.id && nodeSelection.first !== lineData[0].target.id) {
                                return;
                            }

                            clickedOnRelation(lineData[0].source.id, lineData[0].target.id);
                        });

                    return lineGroup;
                },
                update => update,
                exit => exit.remove()
            );

        const shortenText = (t) => {
            if (t.length <= 15) return t;
            return t.substring(0, 7) + '...' + t.substring(t.length-3)
        };

        const node = svgNodeGroup
            .selectAll("g.node")
            .data(subgraph.nodes, d => d.id)
            .join(
                enter => {
                    const nodeGroup = enter
                        .append("g")
                        .classed("node", true)
                        .classed("pinned", d => d['pinned'])
                        .attr('id', d => idToClass(d.id));

                    nodeGroup.append("text")
                        .attr("dominant-baseline", "hanging")
                        .attr("text-anchor", "middle")
                        .text(d => shortenText(d["label"]))
                        .attr('x', 0)
                        .attr('y', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius)+5)
                        .on("mouseover", e => {
                            d3.select(e.target).text(d => d['label'])
                        })
                        .on("mouseout", e => {
                            d3.select(e.target).text(d => shortenText(d['label']))
                        });
                    // node tooltip
                    nodeGroup.append("title")
                        .text(d => d.id);

                    nodeGroup.append("circle")
                        .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius))
                        .attr('stroke', d => categoryNodeColors[d.category])
                        .attr('fill', d => categoryNodeColors[d.category])
                        .on('mouseover', (e) => {
                            const circle = d3.select(e.target);
                            const nodeData = circle.data()[0];
                            setDetailNodeLegend(nodeData);
                            if(currentView.view !== "root") return;
                            circle.classed('hovered', true);
                            const nodeId = circle.data()[0].id;
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('hovered', true);

                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId) + '.hovered text').classed('hovered', true);

                        })
                        .on('mouseout', (e) => {
                            if(currentView.view !== "root") return;
                            const circle = d3.select(e.target).classed('hovered', false);
                            const nodeId = circle.data()[0].id;
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId) + '.hovered text').classed('hovered', false);
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('hovered', false);

                        })
                        .on("click", (e) => {
                            if(currentView.view !== "root") return;
                            if(!nodeSelection.first) {
                                const circle = d3.select(e.target).classed('selected', true);
                                const nodeData = circle.data()[0];
                                nodeSelection.first = nodeData.id;

                                d3.selectAll('g.linkgroup g.' + idToClass(nodeData.id)).classed('largehovered', true);
                            }
                            else {
                                d3.select(".node circle.selected").classed("selected", false);
                                const circle = d3.select(e.target);
                                const nodeId = circle.data()[0].id;

                                // Remove hover effect
                                d3.selectAll('g.linkgroup g.' + idToClass(nodeId) + '.hovered text').classed('hovered', false);
                                d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('hovered', false);

                                d3.selectAll('g.linkgroup g.' + idToClass(nodeSelection.first)).classed('largehovered', false);
                                if(nodeId !== nodeSelection.first) {
                                    clickedOnRelation(nodeSelection.first, nodeId);
                                    nodeSelection.first = null;
                                }
                                else {
                                    nodeSelection.first = null;
                                }
                            }

                        })
                    nodeGroup
                        // @ts-ignore
                        .call(d3.drag()
                            .on("start", (event, d) => {
                                if(currentView.view !== "root") return;
                                if (!event.active) simulation.alpha(ALPHA_INIT).restart();
                                d.fx = d.x;
                                d.fy = d.y;

                            })
                            .on("drag", (event, d) => {
                                if(currentView.view !== "root") return;
                                d.fx = event.x;
                                d.fy = event.y;

                            })
                            .on("end", (event, d) => {
                                if(currentView.view !== "root") return;
                                if (!event.active) simulation.alpha(ALPHA_INIT);
                                delete d['fx']
                                delete d['fy']
                            }));

                    return nodeGroup;
                },
                update => {
                    const nodeGroup = update
                        .classed("pinned", d => d['pinned']);

                    nodeGroup.select('text')
                        .text(d => shortenText(d["label"]));
                    // node tooltip
                    nodeGroup.select("title")
                        .text(d => d.id);


                    nodeGroup.select("circle")
                        .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius))
                        .attr('stroke', d => categoryNodeColors[d.category]);

                    return nodeGroup;
                },
                exit => exit.remove()
            );


        simulation.nodes(subgraph.nodes);
        maxLinkDist = Math.max(...subgraph.links.map(link => link.freq));

        simulation.force("link").links(subgraph.links);

        updateForces({ simulation, maxLinkDist, categoriesDetailsLength, restart:false });

        simulation.on("tick", () => {
            link.selectAll('path')
                // .attr('d', d => createPath(d.source.x,d.source.y,d.target.x,d.target.y).toString())
                .attr('d', d => d.samecategory?createArc(d.source.x,d.source.y,d.target.x,d.target.y):createLine(d.source.x,d.source.y,d.target.x,d.target.y)
                )

                // .attr("x1", d => d.source.x)
                // .attr("y1", d => d.source.y)
                // .attr("x2", d => d.target.x)
                // .attr("y2", d => d.target.y);

            link.selectAll('text')
                .attr('x', d => d.target.x + 20)
                .attr('y', d => d.target.y + 20);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);

            const hullPoints = [];
            for (let i = 1; i <= categoriesDetailsLength; i++) {
                hullPoints.push({
                    category: i,
                    hulls: d3.polygonHull(subgraph.nodes.filter(d => d["category"] === i).map(d => [d.x, d.y]))
                });
            }

            const hullPadding = 25;
            for (let i = 1; i <= categoriesDetailsLength; i++) {
                if (hullPoints[i - 1].hulls) {
                    d3.select('.hull_' + i).attr('d', smoothHull(hullPoints[i - 1].hulls, hullPadding));
                }
            }

            const entropyBar = d3.select('#alpha_value').style('width', simulation.alpha() * 100 + "%");
            if (simulation.alpha() > 0.5) {
                entropyBar.classed("bg-danger", true).classed("bg-warning", false).classed("bg-success", false);
            }
            else if (simulation.alpha() > 0.2) {
                entropyBar.classed("bg-warning", true).classed("bg-danger", false).classed("bg-success", false);
            }
            else {
                entropyBar.classed("bg-warning", false).classed("bg-danger", false).classed("bg-success", true);
            }
        });

        d3.selectAll("g.intracategory path").style('opacity', d3.select("#interclusterEdgeOpacity").node().value);
        d3.select("#interclusterEdgeOpacity").on('change', (e) => {
            d3.selectAll("g.intracategory path").style('opacity', e.target.value);
        })
        d3.selectAll("g.betweencategory path").style('opacity', d3.select("#intraclusterEdgeOpacity").node().value);
        d3.select("#intraclusterEdgeOpacity").on('change', (e) => {
            d3.selectAll("g.betweencategory path").style('opacity', e.target.value);
        })
        d3.selectAll("g.node text").style('opacity', d3.select("#nodeLabelOpacity").node().value);
        d3.select("#nodeLabelOpacity").on('change', (e) => {
            d3.selectAll("g.node text").style('opacity', e.target.value);
        })
        nodeRadiusScale[selectedNodeRadiusScale].range([1, d3.select("#maxRadius").node().value]);
        d3.selectAll("g.node circle").attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius));
        d3.select("#maxRadius").on('change', (e) => {
            nodeRadiusScale[selectedNodeRadiusScale].range([1, e.target.value]);
            d3.selectAll("g.node circle").attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius));
        })

        d3.selectAll(".clusternodecount").on('change', (e) => {
            const categoryIds = BlobLegendsColors.map(d => ({encoding: d.encoding, id:'cluster'+d.encoding+'count'}));
            const categorycount = {}
            categoryIds.forEach((categoryId) => {
                categorycount[categoryId.encoding] = d3.select('#' + categoryId.id).property('value');
            });
            setSelectedNode({
                ...selectedNode,
                category_count: {
                    categorycount: categorycount
                }
            });
        });
        


        d3.zoom().on("zoom", (e) => {
            svg.attr('transform', e.transform)
            // @ts-ignore
        })(svgRoot);

        // BEGIN: Setup RelationView

        const clickedOnRelation = async (node1, node2) => {
            simulation.stop();
            d3.select(".selected").classed("selected", false);
            d3.selectAll(".hovered").classed("hovered", false);
            d3.selectAll(".largehovered").classed("largehovered", false);

            setShowRelationViewLegends(true);

            const transitionSpeed = 750;
            const depGraphResponse = await fetch(`${apiUrls.general}/interaction/${node1}/${node2}/true`);
            const depGraph = processCytoscapeGraph(await depGraphResponse.json());
            
            const relationalNodeSepDist = 800;
            const relationalMaxHeight = 400;

            // Add the relational Edges
            const sankeyGraphData = getSankeyGraph(depGraph, node1, node2);
            const nodeOrder = {
                "rightPos": 0,
                "rightNeu": 1,
                "rightNeg": 2,
                "leftPos": 3,
                "leftNeu": 4,
                "leftNeg": 5
            }
            const sankeyGraph = sankey()
                .nodeId(d => d.id)
                .nodeAlign(d => {
                    if(d.id === node1) return 0;
                    if(d.id === node2) return 2;
                    return 1;
                })
                .nodeSort((a, b) => {
                    nodeOrder[node1] = -2;
                    nodeOrder[node2] = -1;
                    return nodeOrder[a] - nodeOrder[b];
                })
                .nodeWidth(1)
                .nodePadding(1000000)
                .extent([
                    [width/2 - relationalNodeSepDist/2, height/2-relationalMaxHeight/2],
                    [width/2 + relationalNodeSepDist/2, height/2+relationalMaxHeight/2]
                ])(sankeyGraphData);

            const node1Loc = {
                x: sankeyGraph.nodes.find(node => node.id === node1).x0,
                y: sankeyGraph.nodes.find(node => node.id === node1).y0
            }
            const node2Loc = {
                x: sankeyGraph.nodes.find(node => node.id === node2).x0,
                y: sankeyGraph.nodes.find(node => node.id === node2).y0
            }

            const heightScale = d3.scaleLinear()
                .range([10, nodeRadiusScale[selectedNodeRadiusScale].range()[1]])
                .domain([
                    Math.min(...sankeyGraph.links.map(val => val.value)),
                    Math.max(...sankeyGraph.links.map(val => val.value)),
                ])
            const rectWidth = 200;

            const node = d3.select("g.relationview g.relationnodes").selectAll(".sankeyNode")
                .data(sankeyGraph.nodes)
                .enter().append("g")
                    .attr("class", "sankeyNode")
                    .attr("id", d => d.id)
                    .classed("original", d => d.id === node1 || d.id === node2)
                    .classed("fake", d => d.id !== node1 && d.id !== node2)
                    .attr("transform", d => `translate(${d.x0-rectWidth/2}, ${d.y0-heightScale(d.value)/2})`);


            const getLinkColor = (data, colors) => {
                let interNode = data.source.id===node1?data.target:data.source;
                return colors.find(color => color.id === interNode.id.substring(interNode.id.length-3)).value;
            }
            const getNodeColor = (data, colors) => colors.find(color => color.id===data.id.substring(data.id.length-3)).value;

            const onClickFakeNodes = (e) => {
                const eData = d3.select(e.target.parentNode).data()[0];
                setEvidenceData({
                    source: eData.source,
                    target: eData.target,
                    polarity: eData.polarity
                });
            };

            const originalNodes = d3.select("g.relationnodes").selectAll(".original");
            const fakeNodes = d3.select("g.relationnodes").selectAll(".fake");

            fakeNodes.append("path")
                .attr("class", "relationarrow")
                .attr("transform", d => `translate(70, 0),scale(80,${Math.max(30, heightScale(d.value))})`)
                .attr("d", d => {
                    if(d.id === node1 || d.id === node2) return "";
                    if(d.id.startsWith("right"))
                        return "M 0 0 h 1 l 0.5 0.5 l -0.5 0.5 h -1 Z";
                    if(d.id.startsWith("left"))
                        return "M 0 0 h 1 v 1 h -1 l -0.5 -0.5 Z";
                })
                .attr("fill", d => getNodeColor(d, influenceNodeColors));
            

            const text = fakeNodes.append("text")
                .attr("x", rectWidth/2)
                .attr("y", -5)
                .attr("dominant-baseline", "text-top")
                .attr("text-anchor", "left")
                .attr("transform", "translate(0, 0)")

            text.append("tspan")
                .attr("x", rectWidth/2)
                .attr("dy", "1.4em")
                .text(d => `F: ${d.freq}`);
            // We can add more text by appending more tspan
            // ...

            fakeNodes.append("span")
                .attr("class", "relationhover")
                .attr("data-hover", d => d.id);
                // TODO: Add hover show more information


            fakeNodes
                .on("mouseover", e => {
                    const elId = d3.select(e.target).data()[0].id;
                    d3.select("#"+elId).classed("hovered", true);
                })
                .on("mouseout", e => {
                    const elId = d3.select(e.target).data()[0].id;
                    d3.select("#"+elId).classed("hovered", false);
                })
                .on("click", onClickFakeNodes);



            const link = d3.select("g.relationview g.relationlinks")
                .attr("fill", "none")
                .attr("stroke-opacity", 0.5)
                .style("mix-blend-mode", "multiply")
                .selectAll(".sankeylink")
                    .data(sankeyGraph.links)
                    .enter().append("path")
                        .attr("class", "sankeylink")
                        .attr("d", sankeyLinkHorizontal())
                        .attr("stroke", d => getLinkColor(d, influenceLinkColors))
                        .style("stroke-width", d => heightScale(d.value));



            d3.select("g.relationview g.relationlinks").transition().duration(transitionSpeed).style("opacity",1);
            d3.select("g.relationview g.relationnodes").transition().duration(transitionSpeed).style("opacity",1);

            relationViewSimulation.nodes(subgraph.nodes);
            relationViewSimulation.force("link").links(subgraph.links);

            const oldCatCenters = calculateCategoryCenters(categoriesDetailsLength, forceProperties.separation.radius, width, height);
            const newCatCenters = calculateCategoryCentersEllipse(categoriesDetailsLength, relationalNodeSepDist+60, relationalMaxHeight + 80, width, height);
            const catTransition = newCatCenters.map((center, idx) => [center[0] - oldCatCenters[idx][0], center[1] - oldCatCenters[idx][1]]);
            
            const getForceX = (d) => d.x + catTransition[d.category-1][0];
            const getForceY = (d) => d.y + catTransition[d.category-1][1];
            relationViewSimulation.force("forceX").strength(0.1)
                .x(d => {
                    if(d.id === node1) return node1Loc.x;
                    if(d.id === node2) return node2Loc.x;
                    return getForceX(d);
                });
            relationViewSimulation.force("forceY").strength(0.1)
                .y(d => {
                    if(d.id === node1) return node1Loc.y;
                    if(d.id === node2) return node2Loc.y;
                    return getForceY(d);
                });

            relationViewSimulation.on("tick", () => {
                d3.selectAll("g.line").selectAll('path')
                    .attr('d', d => d.samecategory?createArc(d.source.x, d.source.y, d.target.x,d.target.y):createLine(d.source.x,d.source.y,d.target.x,d.target.y));

                d3.selectAll("g.line").selectAll('text')
                    .attr('x', d => d.target.x + 20)
                    .attr('y', d => d.target.y + 20);

                d3.select("g.nodegroup").selectAll("g.node")
                    .attr('transform', d => {
                        return `translate(${d.x},${d.y})`
                    });
            })

            relationViewSimulation.alpha(ALPHA_INIT).alphaTarget(ALPHA_TARGET).restart();

            d3.selectAll("g.line").selectAll('path').style('display', 'none');
            d3.selectAll("g.line").selectAll('text').style('display', 'none');

            // Hide hulls and links
            d3.selectAll("g.hullgroup").style("opacity", 0).transition().duration(transitionSpeed).on("end", () => {
                d3.selectAll("g.hullgroup").style("display", "none");
            });
            
            // Initialize back button
            const backbtn = d3.select(".ui .backbtn");
            backbtn.style("opacity", 0).style("display", "inline-block").transition().duration(transitionSpeed*2).style("opacity", 1);
            backbtn.on("click", () => {
                // Update view state
                currentView.view = "root";
                setShowRelationViewLegends(false);

                d3.selectAll("g.hullgroup").style("display", "inline-block");
                d3.selectAll("g.linkgroup").style("display", "inline-block");

                d3.selectAll("g.hullgroup").style("opacity", 1);
                // d3.selectAll("g.linkgroup").style("opacity", 1);

                relationViewSimulation.stop();
                simulation.alpha(ALPHA_INIT).restart();

                d3.selectAll("g.line").selectAll('path').style('display', 'inline-block');
                d3.selectAll("g.line").selectAll('text').style('display', 'inline-block');

                d3.select("g.relationview g.relationlinks").transition().duration(transitionSpeed).style("opacity",0).on("end", () => {
                    d3.select("g.relationview g.relationlinks").html("");
                });
                d3.select("g.relationview g.relationnodes").transition().duration(transitionSpeed).style("opacity",0).on("end", () => {
                    d3.select("g.relationview g.relationnodes").html("");
                });

                backbtn.transition().duration(transitionSpeed*2).style("opacity", 0).on("end", () => {backbtn.style("display", "none")});

                // remove legends
                d3.select("g.relationlegends").html("");
            });
            // Update the view state
            currentView.view = "relation";
        }

        // Start the normal simulation
        if(currentView.view === "root") simulation.restart();

        return cleanUp;
    }


    function debounce(func) {
        var timer;
        return function (event) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(func, 1000, event);
        };
    }

    // This resize callback is also fired at the start of the loading.
    window.addEventListener("resize", debounce((e) => {
        d3UpdateFunc();
    }));

    React.useEffect(d3UpdateFunc);

    return (
        <>
            <div style={{
                display: "flex",
                flexDirection: "column",
            }}>
                <WeightPanel
                    updateWeightValues={weightChanged}
                    useButton={false}
                    buttonText={"Update Weight"}
                    initialUpdateCall={false}
                />
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                }}>
                    <SidePanel
                        apiUrls={apiUrls}

                        currentView={{view: "root"}}

                        forceProperties={forceProperties}
                        updateForces={updateForces}
                        simulation={simulation}
                        maxLinkDist={maxLinkDist}


                        initialPinnedNodes={initialPinnedNodes}
                        updateSelectedNode={updateSelectedNode}
                        onChangeCategoryDetails={(dataFromChild) => {setSidePanelCategoryDetails = dataFromChild} }

                        nodeRadiusScaleChanged={nodeRadiusScaleChanged}
                    />
                    <div style={{
                        width: "100%",
                        minWidth: "800px"
                    }}>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                        }}>
                            <main className="main-ui rsection" style={{
                                    width: "100%",
                                    maxHeight: "80vh",
                                    aspectRatio: "4/3",
                                    display: "flex",
                                    position: "relative",
                                    verticalAlign: "top",
                                    overflow: "hidden",
                            }}>
                                <svg ref={svgRef} id="maingraph" className="fullsize" style={{
                                    position: "absolute",
                                    background: "white",
                                }}>
                                    <g className="everything">
                                        <g className="relationview">
                                            <g className="relationlinks"></g>
                                            <g className="relationnodes"></g>
                                        </g>
                                        <g className="hullgroup"></g>
                                        <g className="linkgroup"></g>
                                        <g className="nodegroup"></g>
                                    </g>
                                    <g className="ui">
                                        <g transform="scale(0.4, 0.4),translate(100, 100)" className="backbtn" style={{
                                            position: "absolute"
                                        }}>
                                            <rect x="-15" y="-15" height="250" width="250" rx="10" ry="10" fill="white" />
                                            <path d="M109.576,219.151c60.419,0,109.573-49.156,109.573-109.576C219.149,49.156,169.995,0,109.576,0S0.002,49.156,0.002,109.575
                                                C0.002,169.995,49.157,219.151,109.576,219.151z M109.576,15c52.148,0,94.573,42.426,94.574,94.575
                                                c0,52.149-42.425,94.575-94.574,94.576c-52.148-0.001-94.573-42.427-94.573-94.577C15.003,57.427,57.428,15,109.576,15z"/>
                                            <path d="M94.861,156.507c2.929,2.928,7.678,2.927,10.606,0c2.93-2.93,2.93-7.678-0.001-10.608l-28.82-28.819l83.457-0.008
                                                c4.142-0.001,7.499-3.358,7.499-7.502c-0.001-4.142-3.358-7.498-7.5-7.498l-83.46,0.008l28.827-28.825
                                                c2.929-2.929,2.929-7.679,0-10.607c-1.465-1.464-3.384-2.197-5.304-2.197c-1.919,0-3.838,0.733-5.303,2.196l-41.629,41.628
                                                c-1.407,1.406-2.197,3.313-2.197,5.303c0.001,1.99,0.791,3.896,2.198,5.305L94.861,156.507z"/>
                                        </g>
                                    </g>
                                </svg>
                            </main>
                            <div style={{
                                width: "300px",
                                display: "flex",
                                flexDirection: "column",
                            }}>
                                <BlobLegends
                                    onChangeNodeRadiusScale={(dataFromChild) => { setBlobLegendNodeRadiusScale = dataFromChild; }}
                                    onChangeRelationviewShow={(dataFromChild) => {setShowRelationViewLegends = dataFromChild; }}
                                    influenceLinkColors={influenceLinkColors}
                                    influenceNodeColors={influenceNodeColors}
                                    height="60%"
                                    onChangeCategoryCount={(dataFromChild) => {setBlobLegendsColors = dataFromChild; }}
                                />
                                <NodeDetail
                                    apiUrls={apiUrls}
                                    onNodeDetailChange={(dataFromChild) => { setDetailNodeLegend = dataFromChild; }}
                                    height="40%"
                                    onCategoryCountChange={(dataFromChild) => {setNodeDetailColors = dataFromChild; }}
                                />
                            </div>
                        </div>
                        <EvidencePanelWrapper apiUrls={apiUrls} onDataChange={(dataFromChild) => { setEvidenceData = dataFromChild; }} />
                    </div>
                </div>
            </div>
        </>
    )
};

export default MainGraph;