import config from '../config.json'
import { Node, Link } from '../types';
import { Weights } from '../features/weights/weights'
import { VizControls } from '../features/viz-controls/vizControls'


export function getNodeWeights(nodeIds: string[], weights: Weights["value"]): Promise<{
	[node: string]: number
}> {
	return fetch(`${config.vizApiUrl}/noderadius`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			nodes: { nodes: nodeIds },
			weights: { weights }
		})
	}).then(response => response.json())
}

export function getCategories(): Promise<{
	[id: string]: string
}> {
	return fetch(`${config.vizApiUrl}/categories`).then(response => response.json())
}

export function getSynonyms(node: Node): Promise<string[]> {
	return fetch(`${config.apiUrl}/synonyms/${node.id}`)
		.then(response => response.json())
}

export function getBestSubgraph(nodes: string[], categorycount: VizControls["categoryCounts"] ): Promise<{
	nodes: Node[],
	links: Link[]
}> {
	return fetch(`${config.vizApiUrl}/getbestsubgraph`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			nodes: {nodes},
			category_count: { categorycount }
		})
	}).then(response => response.json())
}