import React from 'react';
import * as d3 from "d3";
import { Node } from '../../types';
import { getSynonyms } from '../../utils/vizapi';
import { selectVizControls } from '../../features/viz-controls/vizControls';
import { useAppSelector } from '../../app/hooks';

const NodeDetail = ({ height, node }: { height: `${number}%`, node: Node }) => {

    const [synonyms, setSynonyms] = React.useState<string[]>([]);

    // Redux states
    const vizControls = useAppSelector(selectVizControls)

    React.useEffect(() => {
        if(node === null || node === undefined) return
        console.log("Loading hovered node synonyms")
        getSynonyms(node).then(result => {
            setSynonyms(result);
        })
    }, [node])

    return <aside className=" rsection" style={{
        width: "100%",
        height: height,
        position: "relative",
        verticalAlign: "top",
        overflow: "auto",
        backgroundColor: "white",
        padding: "10px",
        paddingLeft: "20px",
        paddingTop: "20px"
    }}>
        <h5 style={{
            textDecoration: "underline",
        }}>{node!==undefined?node.label:"Hover a node to see details"}</h5>
        <p><b>ID:</b> {node!==undefined?node.id:""}</p>
        <p><b>Category:</b> {node!==undefined?<span  style={{
            color: vizControls.categoryDetails.length===0?"black":vizControls.categoryDetails[node.category-1].color
        }}>{vizControls.categoryDetails.length===0?"":vizControls.categoryDetails[node.category - 1].id}</span>:""}</p>
        <p><b>Detected Synonyms:</b><br/></p>
        <ul>
            {synonyms.map((syn, i) => <li key={i}>{syn}</li>)}
        </ul>
    </aside>
}

export default NodeDetail;