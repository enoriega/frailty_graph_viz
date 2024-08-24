import React from 'react';
import ReactDOM from 'react-dom';
import {
	BrowserRouter,
	Routes,
	Route
  } from "react-router-dom"
import App from './App';
import EvidenceIndex from './EvidenceIndex';
import Overview from './Overview';
import NetworkViz from './NetworkViz';
import ScrollToTop from './components/ScrollToTop';
import config from "./config.json"

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import StructuredSearch from "./StructuredSearch";
import MainGraph from "./components/blob_viz/MainGraph";
import ArticleViewer from "./ArticleViewer";

  
// ========================================
const rootElement = document.getElementById('root');

const { apiUrl, vizApiUrl } = config
console.log(apiUrl)

let candidateOverviewEntities = [
	["uniprot:P05231", "IL-6"],
	["uniprot:P53816", "Phospholipase A and acyltransferase 3"],
	["uniprot:Q53H76", "Phospholipase A1 member A"],
	["uniprot:O15496", "Group 10 secretory phospholipase A2"],
	["uniprot:Q9BX93", "Group XIIB secretory phospholipase A2-like protein"],
	["uniprot:P04054", "Phospholipase A2"],
	["uniprot:P14555", "Phospholipase A2, membrane associated"],
	["uniprot:Q5R387", "Putative inactive group IIC secretory phospholipase A2"],
	["uniprot:Q9UNK4", "Group IID secretory phospholipase A2"],
	["uniprot:Q9NZK7", "Group IIE secretory phospholipase A2"],
	["uniprot:P39877", "Phospholipase A2 group V"],
	["uniprot:Q13093", "Platelet-activating factor acetylhydrolase"],
	["uniprot:Q13018", "Secretory phospholipase A2 receptor"]
]

ReactDOM.render(
	<BrowserRouter>
		<Routes>
			<Route path="*" element={<App />}>
				<Route index element={
					<>
						<Overview 
							apiUrl={ apiUrl }
							// entityId="uniprot:P05231"
							// entityName="IL-6"
							entityChoices={candidateOverviewEntities}
						/>
						
						<ScrollToTop />
					</>}
				/>
				<Route path="viz" element={
					<>
						<NetworkViz
							apiUrl={ apiUrl } />
						<ScrollToTop />
					</>} />
				<Route path="evidence-index" element={
					<>
						<EvidenceIndex apiUrl={ apiUrl } defaultResults={ 100 } />
						<ScrollToTop />
					</>
				} />
				<Route path="structured-search" element={
					<>
						<StructuredSearch apiUrl={ apiUrl } />
						<ScrollToTop />
					</>
				}/>
				<Route path="blob-viz-il6" element={
					<>
						<MainGraph key="MainGraphIL6" apiUrls={{viz: vizApiUrl, general: apiUrl}} defaultEntities={{
							nodes: {
								nodes: ["uniprot:P05231"],
								labels: ["Interleukin-6"],
								categories: [1]
							}
						}} />
						<ScrollToTop />
					</>
				} />
				<Route path="blob-viz-tnf-fat" element={
					<>
						<MainGraph key="MainGraphTNFFAT" apiUrls={{viz: vizApiUrl, general: apiUrl}} defaultEntities={{
							nodes: {
								nodes: ["uniprot:P01375", "cl:CL:0000136", "uberon:UBERON:0001013"],
								labels: ["TNF", "Adipocytes",  "Adipose Tissue"],
								categories: [1, 1, 1]
							}
						}} />
						<ScrollToTop />
					</>
				} />

				<Route path="article/:article_id" element={
					<>
						<ArticleViewer apiUrl={apiUrl} />
						<ScrollToTop />
					</>
				} />

				<Route
					path="*"
					element={
						<main style={{ padding: "1rem" }}>
						<p>There's nothing here!</p>
						</main>
					}
				/>
			</Route>
		</Routes>
	</BrowserRouter>,
	rootElement
);
  