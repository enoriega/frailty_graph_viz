import React from "react";
import EvidenceTaggerPanel from "./EvidenceTaggerPanel";
import EvidenceItem from "./evidence_panel/EvidenceItem";
import { fetchEvidenceLabels, assignEvidenceLabels } from "../utils/api";
import "./evidence_panel.css";


function newTagAdded(props){
	let source = props.source
	const newTagName = props.tagName
	// Add the new tag without checkmark to the other evidences
	const otherEvidence = document.querySelectorAll("ul#evidence > li")
	otherEvidence.forEach(li => li.labels[newTagName] = false)
	// Set the check mark on the source element
	source.labels[newTagName] = true
}


export default function EvidencePanel({ apiUrl, items, header }) {

	let [labels, setLabels] = React.useState({})
	let [focusSentence, setFocusSentence] = React.useState()
	let [showTaggerPanel, setShowTaggerPanel] = React.useState(false)
	let [taggerPanelStyle, setTaggerPanelStyle] = React.useState({})
	let [highlightedSentence, setHighlightedSentence] = React.useState()


	let saveLabelChange =
		({sentence, tagName, checked}) => {
			// Update the labels in the state
			labels[tagName] = checked;
			// Update the back end
			assignEvidenceLabels(apiUrl, sentence, labels)
		}

	items = items.map((i, ix) => {

		// Build the link to the network view
		// const urlPath = `/viz?src=${i.source}&dst=${i.destination}&bidirect`

		const pattern =  /PMC\d+/;
		const matches = i.hyperlink.match(pattern);
		const urlPath = matches ? "/#/article/" + matches[0] : "#";

		return (<EvidenceItem 
			key={ix}
			markup={i.markup}
			hyperlink={i.hyperlink}
			vizPath={i.source && urlPath} // Will assign the vizPath only if the source is not null
			sentence={i.rawSentence}
			impact={i.impact}
			highlighted={highlightedSentence === ix}
			onClick={
				async (event) => {
					setShowTaggerPanel(false)
					setHighlightedSentence(null)
					// Set the focus sentence to the clicked item's sentence
					const focusSentence = i.markup
					setFocusSentence(focusSentence);
					// Retrieve the labels from the backend for this focus sentence
					const labels = await fetchEvidenceLabels(apiUrl, focusSentence)
					setLabels(labels)
					// Update the position of the tagger panel based on the location of the click
					const taggerPanelStyle = {
						position: "absolute",
						top: event.pageY,
						left: event.pageX
					}
					setShowTaggerPanel(true) // Also show it
					setTaggerPanelStyle(taggerPanelStyle)
					// Highlight the current item
					setHighlightedSentence(ix);
				}
			}
		/>)})


	// Fetch the focus sentence from the state to support the evidence panel

	const taggerPanel = showTaggerPanel ? 
		<EvidenceTaggerPanel 
			sentence={focusSentence} 
			labels={ labels }
			handleCheck={ saveLabelChange }
			handleNewTag={ saveLabelChange }
			style={taggerPanelStyle}
			handleClose={ () => {
				setShowTaggerPanel(false)
				setHighlightedSentence(null)
			} }
		/>  : <></>;

	return (
		<div>
			
			{taggerPanel}
			<div className="evidence_pane">
			{ header }
				<ul>
					{items}
				</ul>
			</div>
		</div>
	)
}