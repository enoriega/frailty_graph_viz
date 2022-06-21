import { Button, Collapse } from "react-bootstrap";
import EntityAutoComplete from "./entityAutoComplete";
import { useState } from "react";
import "../styles/SidePanel.scss";

function SidePanel({ currentView, simulation, maxLinkDist, apiUrls, updateSelectedNode, initialPinnedNodes, nodeRadiusScaleChanged, forceProperties, updateForces, onChangeCategoryDetails }) {
    const [entityOpen, setEntityOpen] = useState(false);
    const [visualOpen, setVisualOpen] = useState(false);
    const [graphParamsOpen, setGraphParamsOpen] = useState(false);
    const [othersOpen, setOthersOpen] = useState(false);
    const [categoryDetails, setCategoryDetails] = useState([]);
    const categoriesDetailsLength = Object.keys(categoryDetails).length;

    onChangeCategoryDetails(setCategoryDetails);



    return <div className="rsection p-3 bg-white" style={{
        minWidth: "360px",
        overflow: "auto",
        maxHeight: "80vh"
    }}>
        <span className="d-flex align-items-center pb-3 mb-3 link-dark text-decoration-none border-bottom">
            <span className="fs-5" style={{fontWeight: "bold"}}>Controls</span>
        </span>
        <ul className="list-unstyled ps-0">
            <li className="mb-1">
                <Button
                    className="btn btn-toggle align-items-center rounded collapsed"
                    onClick={() => setEntityOpen(!entityOpen)}
                    aria-controls="example-collapse-text"
                    aria-expanded={entityOpen}
                >
                    Entity
                </Button>
                <Collapse in={entityOpen}>
                    <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                        <li>
                            <EntityAutoComplete
                                updateSelectedNode={updateSelectedNode}
                                apiUrls={apiUrls}
                                initialPinnedNodes={initialPinnedNodes}
                            />
                        </li>
                        {categoryDetails.map(({id, color, encoding}, i) => <li key={encoding}>
                            <label htmlFor={"cluster"+(encoding)+"count"} className="form-label" style={{color: color}}>{id}</label>
                            <input type="number" className="form-control clusternodecount" min="3" max="50" step="1" id={"cluster"+(encoding)+"count"} defaultValue="5" />
                        </li>)}
                    </ul>
                </Collapse>
            </li>
            <li className="mb-1">
                <Button
                    className="btn btn-toggle align-items-center rounded collapsed"
                    onClick={() => setVisualOpen(!visualOpen)}
                    aria-controls="example-collapse-text"
                    aria-expanded={visualOpen}
                >
                    Visual
                </Button>
                <Collapse in={visualOpen}>
                    <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                        <li>
                            <label htmlFor="interclusterEdgeOpacity" className="form-label">Inter Category Link Opacity</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="interclusterEdgeOpacity" defaultValue="0.1" />
                        </li>
                        <li>
                            <label htmlFor="intraclusterEdgeOpacity" className="form-label">Between Category Link Opacity</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="intraclusterEdgeOpacity" defaultValue="0.1" />
                        </li>
                        <li>
                            <label htmlFor="nodeLabelOpacity" className="form-label">Entity Label Opacity</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="nodeLabelOpacity" defaultValue="1" />
                        </li>
                        <li>
                            <label htmlFor="maxRadius" className="form-label">Maximum Radius of Each Entity</label>
                            <input type="range" className="form-range" min="1" max="50" step="1" id="maxRadius" defaultValue="30" />
                        </li>
                    </ul>
                </Collapse>
            </li>
            <li className="mb-1">
                <Button
                    className="btn btn-toggle align-items-center rounded collapsed"
                    onClick={() => setGraphParamsOpen(!graphParamsOpen)}
                    aria-controls="example-collapse-text"
                    aria-expanded={graphParamsOpen}
                >
                    Graph Parameters
                </Button>
                <Collapse in={graphParamsOpen}>
                    <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                        <li>
                            <span><b>Node Radius Scale</b></span><br/>
                            <div className="form-check form-switch m-3">
                                <input type="checkbox" className="form-check-input" id="noderadiuslog" defaultChecked={false} onChange={e => {
                                    if(currentView.view !== "root") return;
                                    if(e.target.checked) {
                                        nodeRadiusScaleChanged('log');
                                    }
                                    else {
                                        nodeRadiusScaleChanged('linear');
                                    }
                                }} />
                                <label className="form-check-label" htmlFor="noderadiuslog">Logarithmic</label>
                            </div>
                        </li>
                        <li>
                            <label htmlFor="graphparamsepfactor" className="form-label">Separation Factor</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="graphparamsepfactor" defaultValue="0.1" onChange={e => {
                                if(currentView.view !== "root") return;
                                forceProperties.separation.strength = parseFloat(e.target.value);
                                updateForces({ simulation, maxLinkDist, categoriesDetailsLength, restart:true });
                            }} />
                        </li>
                        <li>
                            <label htmlFor="linkstrength" className="form-label">Link Strength</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="linkstrength" defaultValue="0.9" onChange={e => {
                                if(currentView.view !== "root") return;
                                forceProperties.link.strength = parseFloat(e.target.value);
                                updateForces({ simulation, maxLinkDist, categoriesDetailsLength, restart:true });
                            }} />
                        </li>
                    </ul>
                </Collapse>
            </li>
            <li className="border-top my-3"></li>
            {/* <li className="mb-1">
                <Button
                    className="btn btn-toggle align-items-center rounded collapsed"
                    onClick={() => setOthersOpen(!othersOpen)}
                    aria-controls="example-collapse-text"
                    aria-expanded={othersOpen}
                >
                    Others
                </Button>
                <Collapse in={othersOpen}>
                    <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                        <li><span className="link-dark rounded">Others</span></li>
                    </ul>
                </Collapse>
            </li> */}
        </ul>
    </div>
};

export default SidePanel;