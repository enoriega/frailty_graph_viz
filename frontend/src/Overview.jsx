import { useState, useEffect } from 'react';
import EntityColumn from './components/overview/EntityColumn';
import { getOverviewData, searchEntity } from "./utils/api"
import customWeight from './utils/custom_weight';
import { getEntityCategory, groupBy } from './utils/utils';
import {Container, Row, Col, Form, Spinner, Dropdown} from 'react-bootstrap'
import WeightPanel from './components/weight/WeightPanel';
import {Typeahead, Highlighter, Token} from 'react-bootstrap-typeahead';
import EntitySearchResultItem from './EntitySearchResultItem';

function filterItems(items, shouldContain){
	if(shouldContain){
		return items.filter(
			item => 
				item.name.toLowerCase().includes(shouldContain) || item.id.toLowerCase().includes(shouldContain)
		);
	}
	else
		return items;
}

// Ad hoc function to transform data from arrays to objects
function array2obj(data){
	return data.map(
		item => {
			return	{ 
				id: item[0],
				name: item[1],
				freq: item[2],
				meta: item[3]
			};
		}
	)
}

// Sorting functions
function sortByEntityName(a, b){
	return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
}

function sortByEntityId(a, b){
	return (a.id > b.id) ? 1 : -1;
}

function sortByFrequency(a, b){
	return -(a.freq - b.freq);
}

function sortByCustomWeight(a, b){
	return -(a.weight - b.weight);
}
////////////////////////////////////////////////////////////////////////////////

// Group the elements by their entity type
const categories = {
	"uniprot": "Proteins or Gene Products",
	"mesh": "Diseases",
	"go": "Biological Process",
	"fplx": "Proteins or Gene Products",
	"pubchem": "Chemicals",
	"interpro": "Proteins or Gene Products",
	"proonto": "Proteins or Gene Products",
	"chebi": "Chemicals",
	"pfam": "Proteins or Gene Products",
	"frailty": "Biological Process",
	"bioprocess": "Biological Process",
	"atcc": "Cells, Organs and Tissues",
	"cellosaurus": "Cells, Organs and Tissues",
	"cl": "Cells, Organs and Tissues",
	"tissuelist": "Cells, Organs and Tissues",
	"uberon": "Cells, Organs and Tissues",
}

function groupByEntityType(items){
	return groupBy(items, item => categories[getEntityCategory(item.id)]);
}
//////////////////////////////////////////

function EntityTypeahead({ items, onInputChange, onChange }){

  return <Typeahead
            id="basic-typeahead-single"
            labelKey={ (option) => `${option.desc.text} (${option.id.text})`}
            onChange={onChange}
			onInputChange={onInputChange}
            options={items}
            placeholder="Type an entity name or id..."
            // multiple
            renderMenuItemChildren={
              (option, { text }, index) => {

                return <EntitySearchResultItem searchText={text} option={option} showCategoryColor={false} />
              }
            }
        />
}

export default function Overview({apiUrl, entityChoices}){

	const [isLoading, setLoading] = useState(true);
	let [reciprocals, setReciprocals] = useState([]);
	let [influenced, setInfluenced] = useState([]);
	let [influencers, setInfluencers] = useState([]);
	let [chosenEntity, setChosenEntity]  = useState(0);
	let [anchorEntity,  setAnchorEntity] = useState(["uniprot:P05231", "Interleukin-6"])
	let [inputSearchEntity, setInputSearchEntity]  = useState(null);

	let [queryResults, setQueryResults] = useState([]);

	let [showInfluence, setShowInfluence] = useState(true);
	let [showReciprocal, setShowReciprocal] = useState(true);
	let [showInfluenced, setShowInfluenced] = useState(false);

	const [orderCriterion, setOrderCritertion] = useState(1);
	const [shouldContain, setShouldContain] = useState('');

	const [weightValues, setWeightValues] = useState({
		frequency: 1,
		hasSignificance: 1,
		avgSignificance: 1,
		avgImpactFactor: 1,
		maxImpactFactor: 1,
		pValue: 1,
	});

	useEffect(() => {
		const timer = setTimeout(() => {
				searchEntity(apiUrl, inputSearchEntity)
				.then((r) => setQueryResults(r))
		}, 1000)

		return () => clearTimeout(timer);
	},  [inputSearchEntity])


	// Side effect to load the weight values from local storage
	useEffect(() => {
		const storedWeightValues = JSON.parse(localStorage.getItem('overviewWeightValues'));
		if(storedWeightValues){
			setWeightValues(storedWeightValues);
		}
	}, []); // Use this empty array to make sure the effect is only run once

	let [entityId, entityName] = anchorEntity;

	// Filter the data by the shouldContain variable either by name or id
	influenced = filterItems(influenced, shouldContain);
	influencers = filterItems(influencers, shouldContain);
	reciprocals = filterItems(reciprocals, shouldContain);

	// Compute the custom weight for each item and use this value troughtout the current render
	influencers.forEach(item => {item.weight = customWeight({...item.meta, freq:item.freq}, weightValues)});
	influenced.forEach(item => {item.weight = customWeight({...item.meta, freq:item.freq}, weightValues)});
	reciprocals.forEach(item => {item.weight = customWeight({...item.meta, freq:item.freq}, weightValues)});
	

	useEffect(() => {
		// Fetch the Overview data from the API
		setLoading(true);
		getOverviewData(apiUrl, entityId,
			(data) => {
				setReciprocals(array2obj(data.reciprocals));
				setInfluenced(array2obj(data.influenced));
				setInfluencers(array2obj(data.influencers));
				setLoading(false);
			}
		)
	}, [entityId]); // Second argument necessary to make sure the effect is only called once


	

	let sorter;
	switch(orderCriterion){
		case 1:
			sorter = sortByFrequency;
			break;
		case 2:
			sorter = sortByCustomWeight;
			break;
		case 3:
			sorter = sortByEntityName;
			break;
		case 4:
			sorter = sortByEntityId;
			break;
		default:
			throw `Invalid order criterion: ${orderCriterion}`;
	}

	// Build the dropdown for the entity chooser. This is temporary until the new control is ready
	let dropDownItems = entityChoices.map(
		([id, name], ix) => <Dropdown.Item onClick={
			() => {
				setChosenEntity(ix);
				setLoading(true);
			}
		} key={ix}>
			<b>{name}</b> - {id}</Dropdown.Item>
	)
	// let entityDropdown= <Dropdown>
	// 					  <Dropdown.Toggle variant="secondary" id="dropdown-basic">
	// 						  Choose another entity
	// 					  </Dropdown.Toggle>
	//
	// 					  <Dropdown.Menu>
	// 						  {dropDownItems}
	// 					  </Dropdown.Menu>
	// 					</Dropdown>

	return (
		<>
			{isLoading && <Spinner animation="border" variant="danger" className='loading'/>}
			<span style={{fontSize: "1.5em"}}><b>Overview of </b> <span style={{fontStyle: "italic"}}>{entityName}</span> - <span style={{fontSize: "0.8em" }}>{entityId}</span></span>
			<br />
			{/*{entityDropdown}*/}
			<EntityTypeahead items={queryResults} onInputChange={
				(input) => {
					if(input) {
						// console.log(input)
						setInputSearchEntity(input);
					}
				}
			}
			onChange={
				(choice) => {
					if(choice.length > 0) {
						let id = choice[0].id.text;
						let newId = id.split(":").map((s, ix) => (ix > 0) ? s.toUpperCase() : s).join(':');
						let label = choice[0].desc.text
						setAnchorEntity([newId, label])
					}
				}
			}
			/>
			<br />
			<Form>
				<Row className='mb-3'>
					<Col xs={2}>
					<Form.Group controlId='formSortBy'>
						<Form.Label>Sort by:</Form.Label>
						<Form.Select 
							aria-label="Order elements by"
							onChange={
								evt => {
									const chosen = evt.target.value;
									setOrderCritertion(parseInt(chosen));
								}
							}>
							<option value="1">Frequency</option>
							<option value="2">Custom Weight</option>
							<option value="3">Name</option>
							<option value="4">Database ID</option>
						</Form.Select>
					</Form.Group>
					</Col>
					<Col>
					<Form.Group controlId='formFilterName'>
						<Form.Label>Filter by:</Form.Label>
						<Form.Control 
							type="text"
						 	placeholder="Type name or database id"
							onChange={
								evt => {
									const contains = evt.target.value.toLowerCase();
									setShouldContain(contains);
								}
							}
						 />
					</Form.Group>
					</Col>
				</Row>
			</Form>
			<br />
			<WeightPanel updateWeightValues={setWeightValues} />
			<br />
			<Container fluid>
				<Form>
					<Form.Group>
					<Form.Label><h4>Columns to display:</h4></Form.Label>
						<br/>
				  <Form.Check
					  inline
					type="switch"
					label="Influenced"
					checked={showInfluenced}
					onChange={() =>  setShowInfluenced(!showInfluenced)}
				  />
					<Form.Check
						inline
					type="switch"
					label="Reciprocal"
					checked={showReciprocal}
					onChange={() =>  setShowReciprocal(!showReciprocal)}
				  />
				  <Form.Check
					  inline
					type="switch"
					label="Influence"
					checked={showInfluence}
					onChange={() =>  setShowInfluence(!showInfluence)}
				  />

					</Form.Group>

				</Form>
			</Container>
			<br />
			<Container fluid>
				<Row>
					{showInfluenced &&
						<Col>
							<EntityColumn title="Influenced By:"
										  data={influenced}
										  sorter={sorter}
										  grouper={groupByEntityType}
										  anchor={entityId}
							/>
						</Col>
					}
					{showReciprocal &&
						<Col>
							<EntityColumn title="Reciprocal With:"
										  data={reciprocals}
										  sorter={sorter}
										  grouper={groupByEntityType}
										  anchor={entityId}
							/>
						</Col>
					}
					{showInfluence &&
						<Col>
							<EntityColumn title="Influence:"
										  data={influencers}
										  sorter={sorter}
										  grouper={groupByEntityType}
										  anchor={entityId}
							/>
						</Col>
					}
				 </Row>
			</Container>
		</>
	)
}