import React from 'react';
import * as d3 from "d3";

const NodeDetail = ({ apiUrl, onNodeDetailChange, height }) => {
    const [synonyms, setSynonyms] = React.useState([]);
    const [currentDetailNode, setCurrentDetailNode] = React.useState({
        "id": "uniprot:P05231",
        "label": "Interleukin-6",
        "category": 1
    });
    onNodeDetailChange(async (d) => {
        const synRes = await fetch(`${apiUrl}/synonyms/${d.id}`);
        const synonyms = await synRes.json();
        setSynonyms(synonyms);
        setCurrentDetailNode(d);
    });

    console.log("letgeds")


    const categoryDetails = [
        { id: "Protein", color: "#411c58" },
        { id: "Diseases", color: "#00308e" },
        { id: "Biological Process", color: "#8a2a44" },
        { id: "Chemical", color: "#10712b" },
    ];
    React.useEffect(() => {
        return () => {
        }
    });

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
        <p><b>Category:</b> {categoryDetails[currentDetailNode.category - 1].id}</p>
        <p><b>Detected Synonyms:</b><br/></p>
        <ul>
            {synonyms.map(syn => <li>{syn}</li>)}
        </ul>
    </aside>
}

export default NodeDetail;