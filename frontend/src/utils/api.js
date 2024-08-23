export function getOverviewData(apiUrl, id, callback) {
	fetch(apiUrl + '/overview/' + id)
		.then(response => response.json())
		.then(json => {
			callback(json);
		});
}

export function getInteraction(apiUrl, src, dst, bidirectional) {
	return fetch(apiUrl + '/interaction/' + src + '/' + dst + '/' + bidirectional)
		.then(response => response.json())
}

export function fetchEvidence(apiUrl, src, dst, bidirectional) {
	return fetch(apiUrl + '/evidence/' + src + '/' + dst + '/' + bidirectional)
		.then(response => response.json())
}

export function fetchNeighbots(apiUrl, id) {
	return fetch(apiUrl + '/neighbors/' + id)
		.then(response => response.json())
}

export function saveCoefficients(apiUrl, interaction, coefficients) {		

	// Build the payload to send
	const payload=
		{
			"query_str": interaction,
			"coefficients": Object.entries(coefficients).map( ([name, value]) => { return {name, value}})
		}

	fetch(apiUrl + '/record_weights/', {
		method: 'PUT',
		body:  JSON.stringify(payload),
		headers: {
			'Content-Type': 'application/json'
		  }
		});

}

// Return all the possible evidence labels in the annotations database
export function fetchEvidenceLabels(apiUrl, evidence){
	let promise
	if(evidence) {
		promise = fetch(apiUrl + '/evidence-labels', {
			method: 'PUT',
			body: JSON.stringify({sentence: evidence}),
			headers: {
				'Content-Type': 'application/json'
			}
		})
	}
	else
		promise = fetch(apiUrl + '/evidence-labels')

	return promise.then(response => response.json())
}

// Save labels in the back end for an evidence sentence
export function assignEvidenceLabels(apiUrl, sentence, labels){

	const body = JSON.stringify({
			sentence: sentence,
			labels: labels
		})
	// Send it to the backend
	fetch(apiUrl + '/label', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: body
	})
}

// Return all the entities listed on the KG
export function fetchEntities(apiUrl){
	return fetch(apiUrl + "/all_entities")
		.then(response => response.json())
}

// Returns all the entities indexed on elasticsearch
export function fetchInteractionTypes(apiUrl){
	return fetch(apiUrl + "/interaction_types")
		.then(response => response.json())
}

export function structuredSearch(apiUrl, controller, controlled, interaction){
	let path = `/ir/structured_search/${controller}/${controlled}`
	if(interaction)
		path += `?interaction=${interaction}`

	return fetch(apiUrl + path)
		.then(response => response.json())
}

export function searchEntity(apiUrl, query){
	let path = `/search_entity/${query}`

	return fetch(apiUrl  + path)
		.then(response => response.json())
}

export function fetchArticleText(apiUrl, article_id){
	let path = `/annotated_article_text/${article_id}`
	let x ="http://127.0.0.1:8000" + path

	return fetch(x)
		.then(response => response.json())
}