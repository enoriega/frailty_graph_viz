import React from 'react';
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import WeightPanel from '../weight/WeightPanel';
import SidePanel from "./SidePanel";
import EvidencePanelWrapper from './EvidencePanelWrapper';
import { idToClass, calculateCategoryCenters, calculateCategoryCentersEllipse, normalizeDistance, categoryNodeColors, useEffectDebugger } from '../../utils/utils';
import BlobLegends from './BlobLegends';
import NodeDetail from './NodeDetail';
import { getBestSubgraph, getNodeWeights } from '../../utils/vizapi';
import { InfluenceColors, Link, Node } from '../../types';
import { initCategories, selectVizControls, setNodeIds } from '../../features/viz-controls/vizControls';
import { selectWeights } from '../../features/weights/weights';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import Color from 'color';


const ASPECT_RATIO = 16/9;
const minHeight = 300;
const minWidth = 300;


function shortenText(t: string) {
    if (t.length <= 15) return t;
    return t.substring(0, 7) + '...' + t.substring(t.length-3)
};

const influenceLinkColors: InfluenceColors = [
    { id:"Pos", value: Color("#4bb543")},
    { id:"Neu", value: Color("grey")},
    { id:"Neg", value: Color("#ff8484")},
];

const influenceNodeColors: InfluenceColors = [
    { id:"Pos", value: Color("#5cc654")},
    { id:"Neu", value: Color("lightgrey")},
    { id:"Neg", value: Color("#ff9595")},
];


function MainGraph() {
    const [subgraph, setSubgraph] = React.useState<{
        nodes: Node[],
        links: Link[]
    }>({
        nodes: [],
        links: []
    });

    const [nodeCenters, setNodeCenters] = React.useState<[number,number][]>([])
    const svgRoot = React.useRef<SVGSVGElement>(null)

    const [hoveredNode, setHoveredNode] = React.useState<Node|null>(null)


    // Redux states
    const dispatch = useAppDispatch();
    const vizControls = useAppSelector(selectVizControls)
    const weights = useAppSelector(selectWeights)

    const nodeRadiusScale = {
        'linear': d3.scaleLinear().range([1,30]),
        'logarithmic': d3.scaleLog().range([1,30]),
    }

    React.useEffect(() => {
        if(vizControls.categoryDetails.length === 0) {
            console.log("getting categorydetails")
            dispatch(initCategories())
            dispatch(setNodeIds(vizControls.nodeIds))
        }
        if(vizControls.categoryDetails.length !== 0) {
            console.log("getting subgraph details")
            getBestSubgraph(vizControls.nodeIds, vizControls.categoryCounts).then(setSubgraph)
        }
    }, [vizControls.nodeIds])


    React.useEffect(() => {
        getBestSubgraph(vizControls.nodeIds, vizControls.categoryCounts).then(newSubgraph => {
            setSubgraph(newSubgraph)
        })
    }, [vizControls.nodeIds, vizControls.categoryCounts])


    React.useEffect(() => {
        console.log("getting Node weights")
        getNodeWeights(subgraph.nodes.map(d=>d.id), weights).then(nodeWeights => {
            const nodeWeightMin = Math.min(...Object.values(nodeWeights));
            const nodeWeightMax = Math.max(...Object.values(nodeWeights));
            nodeRadiusScale[vizControls.nodeRadiusScale].domain([nodeWeightMin, nodeWeightMax]);

            // TODO: Set legend for nodeRadiusScale

            const nodes = structuredClone(subgraph.nodes)
            for (let i = 0; i < subgraph.nodes.length; i++) {
                nodes[i].weight = +nodeWeights[subgraph.nodes[i].id];
            }
            setSubgraph({
                ...subgraph,
                nodes: nodes,
            })

            // Put this in useLayoutEffect later
            // d3.select("g.nodegroup").selectAll<SVGCircleElement, Node>("circle")
            //     .attr('r', d => nodeRadiusScale[vizControls.nodeRadiusScale](d.weight_radius));
        })
    }, [vizControls.nodeIds, weights])

    // Main drawing
    React.useEffect(() => {
        if(
            vizControls.nodeIds.length === 0
            || subgraph.nodes.length === 0
            || Object.keys(vizControls.categoryCounts).length === 0
            || Object.keys(vizControls.categoryDetails).length === 0
            || !svgRoot.current
        ) return
        const height = Math.max(svgRoot.current.clientHeight, minHeight);
        const width = Math.max(svgRoot.current.clientWidth, minWidth);

        const categoryCenters: [number, number][] = calculateCategoryCenters(
            vizControls.categoryDetails.length,
            (width + height) / 2.0 * 0.2,
            width, height
        ) as [number, number][]

        console.log(categoryCenters)

        const newNodeCenters: [number, number][] = []
        
        const SPACING = 10
        let r = 0
        let c = 0

        subgraph.nodes.forEach((node,i) => {
            const nCol = Math.floor(Math.sqrt(vizControls.categoryCounts[node.category]))
            const x = categoryCenters[node.category][0] + c * SPACING
            const y = categoryCenters[node.category][1] + r * SPACING

            newNodeCenters.push([x,y])

            r += 1
            if(r === nCol) {
                r = 0
                c += 1
            }
        })
        setNodeCenters(newNodeCenters)
    }, [subgraph.nodes, vizControls.categoryCounts, vizControls.categoryDetails])


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
                                }}>
                                    <g className="everything">
                                        <g className="relationview">
                                            <g className="relationlinks"></g>
                                            <g className="relationnodes"></g>
                                        </g>
                                        <g className="hullgroup"></g>
                                        <g className="linkgroup"></g>
                                        <g className="nodegroup">
                                            {subgraph.nodes.map((node, i) => <g
                                                className={"node"+node.pinned?" pinned":""}
                                                id={idToClass(node.id)}
                                            >
                                                <text
                                                    dominantBaseline="hanging"
                                                    textAnchor="middle"
                                                    x="0"
                                                    y={nodeRadiusScale[vizControls.nodeRadiusScale](node.weight?node.weight:5)}
                                                >
                                                    {shortenText(node.label)}

                                                </text>

                                            </g>)}
                                        </g>
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
                                    influenceLinkColors={influenceLinkColors}
                                    influenceNodeColors={influenceNodeColors}
                                    height="60%"
                                    radiusScaleDomain={nodeRadiusScale[vizControls.nodeRadiusScale].domain() as [number, number]}
                                    radiusScaleRange={nodeRadiusScale[vizControls.nodeRadiusScale].range() as [number, number]} />
                                <NodeDetail
                                    height="40%"
                                    node={hoveredNode?hoveredNode:subgraph.nodes.find(node => node.id === vizControls.nodeIds[0])!} />
                            </div>
                        </div>
                        {/* <EvidencePanelWrapper apiUrls={apiUrls} onDataChange={(dataFromChild) => { setEvidenceData = dataFromChild; }} /> */}
                    </div>
                </div>
            </div>
        </>
    )
}

export default MainGraph