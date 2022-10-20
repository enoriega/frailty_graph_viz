import { useLocation } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import CytoscapeComponent from "react-cytoscapejs";
import klay from 'cytoscape-klay';
import { useEffect, useRef, useState, useMemo } from "react";
import { getInteraction, fetchEvidence, fetchNeighbots, saveCoefficients } from './utils/api';
import { categoryNodeColors, getCategoryFromId } from './utils/utils';
import EvidencePanel from './components/EvidencePanel';
import { Button, Spinner, Row, Col, Container } from 'react-bootstrap';
import WeightPanel from './components/weight/WeightPanel';
import customWeight from './utils/custom_weight';
import "./NetworkViz.css";

Cytoscape.use(klay);

function color_by_label(elem, arrow=false){
	if(elem.id().startsWith("cluster_"))
		return "gray"
	else {
		let label = elem.data()['polarity'].toLowerCase()
		if (label === "positive")//(label.endsWith("(positive)") || label === "positive_association")
			if (arrow)
				return "#77DD77"
			else
				return "#DAF7A6"
		else if (label === "negative")//(label.endsWith("(negative)") || label === "negative_association")
			if (arrow)
				return "#ff4137"
			else
				return "#FAA0A0"
		else
			return "#cfcfc4"
	}
}

function make_label(elem, coefficients){
	const data = elem.data()
	const polarity = data['polarity'];
	const w = customWeight(elem.data(), coefficients)
	const freq = data['freq']
	return `${polarity} (${freq}) W: ${w.toFixed(2)}`
}

const stylesheet = (coefficients) => {
	return [{
		selector: 'node',
		style: {
			shape: 'ellipse',
			// size: "1em",

			// This is a quick fix. We can make this more elegant later
			'background-color': (ele) => categoryNodeColors[getCategoryFromId(ele.data()['id'])].hex(),
			label: (ele) => ele.data()['label'],
			title: (ele) => ele.data()['id'], // I don't know if there is a way to have a hover to show id effect in cytoscapejs

			// 'font-size': '.3em'
		}
	},

	{
		selector: 'edge',
		style: {
			// 'width': 'data(freq)',
			width: function(ele){
				if(ele.id().startsWith("cluster_"))
					return 1
				else
					return 3//arizona_weight(ele.data())
			},
			label: (ele) => {
				if(ele.id().startsWith("cluster_"))
					return `Click to Expand (${ele.data()['freq']}) ...`
				else
					return make_label(ele, coefficients)
			},
			'target-arrow-shape': 'triangle',
			'curve-style': 'bezier',
			"text-rotation": "autorotate",
			"line-color": color_by_label,
			'target-arrow-color': (elem) => { return color_by_label(elem, true) },
			'display': (elem) => { return elem.id().startsWith("cluster_")?'element':'none' }
		}
	}]
};

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
	const { search } = useLocation();
  
	return useMemo(() => new URLSearchParams(search), [search]);
  }

export default function NetworkViz({ apiUrl }){

	const [elements, setElements] = useState([]);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
	const [evidenceItems, setEvidenceItems] = useState([]);
	const [weightCoefficients, setWeightCoefficients] = useState({
		frequency: 1,
		hasSignificance: 1,
		avgSignificance: 1,
		avgImpactFactor: 1,
		maxImpactFactor: 1,
		pValue: 1,
	});
	const [isLoading, setIsLoading] = useState(true);

	const [expandedNodes, setExpandedNodes] = useState({});

	const [spacingFactor, setSpacingFactor] = useState(10);

	const cyRef = useRef(null);
	const evidence = useRef(null);

	const query = useQuery();


	const  pattern = /^.+ \(([^\(\)]+)\)$/
	let source = query.get("src")
	let destination = query.get("dst")
	let bidirectional = true//query.get("bidirect")
	if(pattern.test(source)) {
		source = source.match(pattern)[1]
	}
	if(pattern.test(destination))
		destination = destination.match(pattern)[1]

	// Side effect to load the weight values from local storage
	useEffect(() => {
		const storedWeightValues = JSON.parse(localStorage.getItem('networkWeightValues'));
		if(storedWeightValues){
			setWeightCoefficients(storedWeightValues);
		}
	}, []); // Use this empty array to make sure the effect is only run once

	useEffect(() => {
		// Initial fetch of the data
		getInteraction(apiUrl, source, destination, bidirectional).then(
			elements => {
				setElements(elements);
				setIsLoading(false);
			}
		);
	}, []);

	useEffect(() => {
		// Imperatively call the cytoscape js api
		// Bind the click event to edges
		cyRef.current.bind('click', 'edge', function(event) {
			
			// Identify the source edge
			let edge = event.target
  
			// If the edge is a cluster, expand it
			if(edge.id().startsWith("cluster_")){
				let prefix = edge.id().split('_')[1]
				cyRef.current.filter(function(ele){return ele.id().startsWith(prefix)}).forEach(
					(e) => {
						e.style("display", "element")
					}
				)
				edge.style("display", "none")
			}
			// If the edge is not a cluster, open the evidence panel
			else{
				setIsLoading(true);
				fetchEvidence(apiUrl, edge.source().id(), edge.target().id(), edge.data()['polarity'])
					.then(
						evidence => {
							evidence.forEach(
								ev => {
									ev.impact = parseFloat(ev.impact)
								}
							)
							evidence.sort((a, b) => b.impact - a.impact)
							
							setEvidenceItems(evidence);
							setIsEvidenceOpen(true);
							setIsLoading(false);
						}
					);
			}
		})

		let tappedBefore;
        let tappedTimeout = 500;

        cyRef.current.on('tap', function(event) {
            const tappedNow = event.target;
            if (tappedTimeout && tappedBefore) {
            clearTimeout(tappedTimeout);
          }
          if(tappedBefore === tappedNow) {
            //tappedNow.trigger('doubleTap', event);
            let node = tappedNow.id()

            if(!(node in expandedNodes)) {
                setIsLoading(true);
                fetchNeighbots(apiUrl, node).then(
					elements => {
						cyRef.current.add(elements)
						expandedNodes[node] = elements
						setSpacingFactor(0);
						setIsLoading(false);
					}
                )
            }
            else{
                let elements = expandedNodes[node]
				console.log(elements)
                let ids = new Set(elements.map((e) => e['data']['id']))


                ids.forEach(function(e) {
                    if(node !== e)
                        cyRef.current.remove(cyRef.current.$id(e))
                })

                delete expandedNodes[node]
            }


            tappedBefore = null;
            // originalTapEvent = null;
          } else {
            tappedTimeout = setTimeout(function(){ tappedBefore = null; }, 300);
            tappedBefore = tappedNow;
          }
        });


	}, []);

	useEffect(() => {
		// Scroll down to the evidence panel if it is open
		if(evidence.current)
			evidence.current.scrollIntoView();
	});


	let layoutOptions = {
		name:"klay",
		spacingFactor: spacingFactor,
		fit: true,
		klay: {

		}
	}

	return (
		<>
			{isLoading && <Spinner animation="border" variant="danger" className='loading'/>}
			<WeightPanel 
				updateWeightValues={setWeightCoefficients}
				useButton={true}
				buttonText={"Record weights"}
				btnCallback={(values) => {
					saveCoefficients(apiUrl, window.location.search, values);
				}}
			/>
				<CytoscapeComponent 
					style={{
						height:"90vh",
						marginRight: "1em",
						margin: ".8em",
						backgroundColor: "white",
						borderRadius: "10px",
						boxShadow: "#929292 0px 0px 10px"
					}}
					cy={(c) => { cyRef.current = c }}
					elements={elements} layout={layoutOptions} zoom={1} stylesheet={stylesheet(weightCoefficients)}
				/>
				{/* </Col>
			</Row> */}
			{ isEvidenceOpen && 
			 <EvidencePanel
				 apiUrl={ apiUrl }
				 items={evidenceItems} header={
				<h3 ref={evidence}>Evidence: 
					{' '} <Button variant="secondary" size="sm" onClick={() => { setIsEvidenceOpen(false); }}>Close</Button>
				</h3>
			 }/> }
		</>
	);
}