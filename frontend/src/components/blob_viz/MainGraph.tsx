import React from 'react';
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import WeightPanel from '../weight/WeightPanel';
import SidePanel from "./SidePanel";
import EvidencePanelWrapper from './EvidencePanelWrapper';
import { idToClass, calculateCategoryCenters, calculateCategoryCentersEllipse, normalizeDistance, useEffectDebugger, createArc, createLine } from '../../utils/utils';
import BlobLegends from './BlobLegends';
import NodeDetail from './NodeDetail';
import { getBestSubgraph, getNodeWeights } from '../../utils/vizapi';
import { InfluenceColors, Link, Node, Point2D } from '../../types';
import { initCategories, selectVizControls, setCurrentView, setNodeIds } from '../../features/viz-controls/vizControls';
import { selectWeights } from '../../features/weights/weights';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import Color from 'color';
import "../styles/MainGraph.scss"

export const categoryNodeColors = [
    Color("#411c58"),
    Color("#00308e"),
    Color("#8a2a44"),
    Color("#10712b"),
    // https://coolors.co/4e7e72-fe9c9a-c1aa85-848a9a
    Color("#1f332e"),
    Color("#fd2521"),
    Color("#886e44"),
    Color("#494e5a"),
]

export const categoryHullColors = {
    1: "#d282be",
    2: "#a6d9ef",
    3: "#ffa770",
    4: "#e5f684",
    // https://coolors.co/4e7e72-fe9c9a-c1aa85-848a9a
    5: "#4e7e72",
    6: "#fe9c9a",
    7: "#c1aa85",
    8: "#848a9a",
}

function shortenText(t: string) {
    if (t.length <= 15) return t;
    return t.substring(0, 7) + '...' + t.substring(t.length-3)
};


function MainGraph() {
    const [subgraph, setSubgraph] = React.useState<{
        nodes: Node[],
        links: Link[]
    }>({
        nodes: [],
        links: []
    });

    const [nodeWeights, setNodeWeights] = React.useState<{[nodeId: string]: number}>({})

    const [nodeCenters, setNodeCenters] = React.useState<Point2D[]>([])
    const [hoveredNode, setHoveredNode] = React.useState<Node|null>(null)
    const [nodeSelection, setNodeSelection] = React.useState<Node|null>(null)

    // Redux states
    const dispatch = useAppDispatch();
    const vizControls = useAppSelector(selectVizControls)
    const weights = useAppSelector(selectWeights)

    const [svgHeight, setSvgHeight] = React.useState(-1)
    const [svgWidth, setSvgWidth] = React.useState(-1)

    const svgRoot = React.useCallback((node: SVGSVGElement) => {
        if(!node) return
        setSvgHeight(node.getBoundingClientRect().height)
        setSvgWidth(node.getBoundingClientRect().width)
    }, [setSvgWidth, setSvgHeight])

    const [nodeWeightDomain, setNodeWeightDomain] = React.useState<Point2D>([0,1])

    const nodeRadiusScale = {
        'linear': d3.scaleLinear().range([1,30]).domain(nodeWeightDomain),
        'logarithmic': d3.scaleLog().range([1,30]).domain(nodeWeightDomain),
    }

    React.useEffect(() => {
        if(vizControls.categoryDetails.length === 0) {
            dispatch(initCategories())
        }
        else {
            getBestSubgraph(vizControls.nodeIds, vizControls.categoryCounts).then(setSubgraph)
        }
    }, [vizControls.categoryDetails.length])

    React.useEffect(() => {
        getBestSubgraph(vizControls.nodeIds, vizControls.categoryCounts).then(setSubgraph)
    }, [vizControls.categoryDetails.length, vizControls.nodeIds, vizControls.categoryCounts])

    React.useEffect(() => {
        if(vizControls.categoryDetails.length === 0
            || vizControls.nodeIds.length === 0
            || subgraph.nodes.length === 0
        ) return
        getNodeWeights(subgraph.nodes.map(d=>d.id), weights).then(nodeWeights => {
            const nodeWeightMin = Math.min(...Object.values(nodeWeights));
            const nodeWeightMax = Math.max(...Object.values(nodeWeights));
            setNodeWeightDomain([nodeWeightMin, nodeWeightMax])
            setNodeWeights(nodeWeights)

            // Ordering weights to subgraph.nodes
            // const orderedNodeWeights = Object.entries(nodeWeights)
            // orderedNodeWeights.sort(([id1,weight1], [id2,weight2]) => subgraph.nodes.findIndex(node => node.id === id2) - subgraph.nodes.findIndex(node => node.id === id1))

            // TODO: Set legend for nodeRadiusScale

            // Put this in useLayoutEffect later
            // d3.select("g.nodegroup").selectAll<SVGCircleElement, Node>("circle")
            //     .attr('r', d => nodeRadiusScale[vizControls.nodeRadiusScale](d.weight_radius));
        })
    }, [subgraph.nodes, weights])

    // Main drawing
    React.useEffect(() => {
        if(
            vizControls.nodeIds.length === 0
            || subgraph.nodes.length === 0
            || Object.keys(vizControls.categoryCounts).length === 0
            || Object.keys(vizControls.categoryDetails).length === 0
            || svgHeight === -1
            || svgWidth === -1
        ) return

        const categoryCenters: Point2D[] = calculateCategoryCenters(
            vizControls.categoryDetails.length,
            (svgWidth + svgHeight) / 2.0 * 0.3,
            svgWidth, svgHeight
        ) as Point2D[]

        const newNodeCenters: Point2D[] = []
        
        const SPACING = 100
        let r = new Array(vizControls.categoryDetails.length).fill(0)
        let c = new Array(vizControls.categoryDetails.length).fill(0)

        subgraph.nodes.forEach((node,i) => {
            const nCol = Math.floor(Math.sqrt(vizControls.categoryCounts[node.category]))
            const x = Math.round(categoryCenters[node.category][0] + c[node.category] * SPACING)
            const y = Math.round(categoryCenters[node.category][1] + r[node.category] * SPACING)

            newNodeCenters.push([x,y])

            r[node.category] += 1
            if(r[node.category] === nCol) {
                r[node.category] = 0
                c[node.category] += 1
            }
        })
        setNodeCenters(newNodeCenters)
    }, [subgraph])

    return (
        <>
            <div style={{
                display: "flex",
                flexDirection: "column",
            }}>
                <WeightPanel
                    updateWeightValues={(d: any) => {}}
                    useButton={false}
                    buttonText={"Update Weight"}
                    initialUpdateCall={false}
                />
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                }}>
                    <SidePanel />
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
                                <svg ref={svgRoot} id="maingraph" className="fullsize" style={{
                                    position: "absolute",
                                    background: "white",
                                    width: "100%",
                                    height: "100%",
                                }}>
                                    {(vizControls.nodeIds.length === 0
                                        || subgraph.nodes.length === 0
                                        || Object.keys(vizControls.categoryCounts).length === 0
                                        || Object.keys(vizControls.categoryDetails).length === 0
                                        || nodeCenters.length === 0
                                        || nodeWeights.length === 0
                                        || (nodeWeightDomain[0] === 0 && nodeWeightDomain[1] === 1))?<text>Loading</text>:
                                    <g className="everything">
                                        <g className="relationview">
                                            <g className="relationlinks"></g>
                                            <g className="relationnodes"></g>
                                        </g>
                                        <g className="hullgroup"></g>
                                        <g className="linkgroup">
                                            {subgraph.links.map((edge, i) => <g
                                                key={idToClass(edge.source)+idToClass(edge.target)}
                                                className={"line "+idToClass(edge.source)+" "+idToClass(edge.target)+" "+(edge.samecategory?"intracategory":"betweencategory")}
                                            >
                                                <text
                                                    x={nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][0]+nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][0]}
                                                    y={nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][1]+nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][1]}
                                                >{edge.freq}</text>

                                                <path
                                                    fill="none"
                                                    onClick={() => {
                                                        // TODO: Add edge click
                                                    }}
                                                    d={edge.samecategory?createArc(
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][0],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][1],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][0],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][1]
                                                    ):createLine(
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][0],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.source)][1],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][0],
                                                        nodeCenters[subgraph.nodes.findIndex(node => node.id == edge.target)][1]
                                                    )}
                                                    opacity={edge.samecategory?vizControls.intraEdgeOpacity:vizControls.interEdgeOpacity}
                                                    onMouseDown={() => {
                                                        // TODO: transition to relation view
                                                    }}
                                                >
                                                </path>
                                            </g>)}
                                        </g>
                                        <g className="nodegroup">
                                            {subgraph.nodes.map((node, i) => <g
                                                key={idToClass(node.id)}
                                                className={"node"+(node.pinned?" pinned":"")}
                                                id={idToClass(node.id)}
                                                transform={`translate(${nodeCenters[i][0]},${nodeCenters[i][1]})`}
                                            >
                                                <text
                                                    dominantBaseline="hanging"
                                                    textAnchor="middle"
                                                    x="0"
                                                    y={nodeRadiusScale[vizControls.nodeRadiusScale](nodeWeights[node.id]?nodeWeights[node.id]:5)}
                                                >
                                                    {shortenText(node.label)}
                                                </text>
                                                <circle
                                                    className={""+(hoveredNode && hoveredNode.id === node.id?" hovered":"")+(nodeSelection && nodeSelection.id === node.id?" selected":"")}
                                                    r={nodeWeights[node.id]?nodeRadiusScale[vizControls.nodeRadiusScale](nodeWeights[node.id]):5}
                                                    stroke={categoryNodeColors[node.category].hex()}
                                                    fill={categoryNodeColors[node.category].hex()}
                                                    onMouseEnter={() => {
                                                        setHoveredNode(node)
                                                    }}
                                                    onMouseLeave={() => {
                                                        setHoveredNode(null)
                                                    }}
                                                    onClick={() => {
                                                        if(nodeSelection === null)
                                                            setNodeSelection(node)
                                                        else {
                                                            if(nodeSelection.id !== node.id) {
                                                                dispatch(setCurrentView("relation"))
                                                            }
                                                            else
                                                                setNodeSelection(null)
                                                        }
                                                    }}
                                                />

                                            </g>)}
                                        </g>
                                    </g>}
                                    {/* <g className="ui">
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
                                    </g> */}
                                </svg>
                            </main>
                            <div style={{
                                width: "300px",
                                display: "flex",
                                flexDirection: "column",
                            }}>
                                <BlobLegends
                                    height="60%"
                                    radiusScaleDomain={nodeRadiusScale[vizControls.nodeRadiusScale].domain() as Point2D}
                                    radiusScaleRange={nodeRadiusScale[vizControls.nodeRadiusScale].range() as Point2D} />
                                <NodeDetail
                                    height="40%"
                                    node={hoveredNode?hoveredNode:subgraph.nodes.find(node => node.id === vizControls.nodeIds[0])!} />
                            </div>
                        </div>
                        {/* <EvidencePanelWrapper/> */}
                    </div>
                </div>
            </div>
        </>
    )
}

export default MainGraph