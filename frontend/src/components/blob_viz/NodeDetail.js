import React from 'react';
import * as d3 from "d3";

const NodeDetail = ({ apiUrls, onNodeDetailChange, height, onCategoryCountChange }) => {
    const [synonyms, setSynonyms] = React.useState([]);
    const [currentDetailNode, setCurrentDetailNode] = React.useState({
        "id": "uniprot:P05231",
        "label": "Interleukin-6",
        "category": 1
    });
    onNodeDetailChange(async (d) => {
        const synRes = await fetch(`${apiUrls.general}/synonyms/${d.id}`);
        const synonyms = await synRes.json();
        setSynonyms(synonyms);
        setCurrentDetailNode(d);
    });
    const [categoryDetails, setCategoryDetails] = React.useState([]);
    onCategoryCountChange(setCategoryDetails);

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
        }}>{currentDetailNode.label}</h5>
        <p><b>ID:</b> {currentDetailNode.id}</p>
        <p><b>Category:</b> <span  style={{
            color: categoryDetails.length===0?"black":categoryDetails[currentDetailNode.category-1].color
        }}>{categoryDetails.length===0?"":categoryDetails[currentDetailNode.category - 1].id}</span></p>
        <p><b>Detected Synonyms:</b><br/></p>
        <ul>
            {synonyms.map((syn, i) => <li key={i}>{syn}</li>)}
        </ul>
    </aside>
}

export default NodeDetail;