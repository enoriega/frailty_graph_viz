import { Button, Collapse } from "react-bootstrap";
import React from "react";
import "../styles/SidePanel.scss";
import { selectVizControls, initCategories, setNodeRadiusScale, setNodeIds, setInterEdgeOpacity, setIntraEdgeOpacity } from '../../features/viz-controls/vizControls';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import EntityTypeahead from "../../EntityTypeahead";
import { searchEntity } from "../../utils/api"
import config from '../../config.json'
import EntitySearchResultItem from "../../EntitySearchResultItem";

interface SearchResult {
    category: number,
    desc: {
        text: string,
        matched: boolean
    },
    id: {
        text: string,
        matched: boolean
    },
    synonyms: {
        text: string,
        matched: boolean
    }[]
}

function SidePanel() {
    const [entityOpen, setEntityOpen] = React.useState(false);
    const [visualOpen, setVisualOpen] = React.useState(false);
    const [graphParamsOpen, setGraphParamsOpen] = React.useState(false);

    // Redux states
    const dispatch = useAppDispatch();
    const vizControls = useAppSelector(selectVizControls)
    const categoryDetails = vizControls.categoryDetails

    // typeahead states
	const [inputSearchEntity, setInputSearchEntity] = React.useState("interleukin-6");
    const [queryResults, setQueryResults] = React.useState<SearchResult[]>([])
	const [pinnedEntities, setPinnedEntities] = React.useState<SearchResult[]>([
        {
            id: {
                text: "interpro:ipr003574",
                matched: false
            },
            desc: {
                text: "interleukin-6",
                matched: true
            },
            synonyms: [
                {
                    text: "interleukin 6",
                    matched: false
                }
            ],
            category: 1
        }
    ])
    const addToPinned = (entity: SearchResult) => {
        setPinnedEntities(entities => {
            const newEntities = [...entities, entity]
            dispatch(setNodeIds(newEntities.map(entity => entity.id.text)))
            return newEntities
        })
    }
    const removePinned = (entity: SearchResult) => {
        setPinnedEntities(entities => {
            const newEntities = entities.filter(e => e.id.text !== entity.id.text)
            dispatch(setNodeIds(newEntities.map(entity => entity.id.text)))
            return newEntities
        })
    }

	React.useEffect(() => {
		const timer = setTimeout(() => {
			searchEntity(config.apiUrl, inputSearchEntity)
				.then(setQueryResults)
		}, 1000)

		return () => clearTimeout(timer);
	}, [inputSearchEntity])

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
                            <EntityTypeahead
                                items={queryResults}
                                onInputChange={
                                    (text: string) => {
                                        if (text)
                                            setInputSearchEntity(text);
                                    }
                                }
                                onChange={
                                    (choice: SearchResult[]) => {
                                        if (choice.length > 0)
                                            addToPinned(choice[0])
                                    }
                                }
                            />
                            <ul style={{
                                listStyleType: "none",
                                paddingLeft: "6px",
                                marginTop: "20px",
                            }}>
                                {pinnedEntities.map((entity, i) => <li key={i}>
                                    <EntitySearchResultItem
                                        searchText={""}
                                        option={entity}
                                        showCategoryColor={true}
                                        onClose={() => {
                                            removePinned(entity)
                                        }}
                                        cssProps={{
                                            marginTop: "6px",
                                            marginBottom: "6px",
                                            borderRadius: "20px",
                                            border: "2px solid #73AD21",
                                        }}
                                    />
                                </li>)}
                            </ul>
                        </li>
                        {categoryDetails.map(({id, nodeColor, hullColor, encoding}, i) => <li key={encoding}>
                            <label htmlFor={"cluster"+(encoding)+"count"} className="form-label" style={{color: hullColor}}>{id}</label>
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
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="interclusterEdgeOpacity" defaultValue="0.03" onChange={(e: React.FormEvent<HTMLInputElement>) => {
                                dispatch(setInterEdgeOpacity(parseFloat(e.currentTarget.value)))
                            }}/>
                        </li>
                        <li>
                            <label htmlFor="intraclusterEdgeOpacity" className="form-label">Between Category Link Opacity</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.01" id="intraclusterEdgeOpacity" defaultValue="0.03" onChange={(e: React.FormEvent<HTMLInputElement>) => {
                                dispatch(setIntraEdgeOpacity(parseFloat(e.currentTarget.value)))
                            }}/>
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
                                    if(vizControls.currentView !== "root") return;
                                    if(e.target.checked) {
                                        dispatch(setNodeRadiusScale("logarithmic"))
                                    }
                                    else {
                                        dispatch(setNodeRadiusScale('linear'))
                                    }
                                }} />
                                <label className="form-check-label" htmlFor="noderadiuslog">Logarithmic</label>
                            </div>
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