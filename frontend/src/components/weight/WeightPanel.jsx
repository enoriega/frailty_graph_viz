import SliderComponent from './SliderComponent';
import LatexFormula from './LatexFormula';
import { useEffect, useState } from 'react';
import "./WeightPanel.css";
import { Button, Col, Row } from 'react-bootstrap';

const getLocalStorageOrDefaultValues = () => {
	const storedWeightValues = JSON.parse(localStorage.getItem('blobVizWeightValues'))
    if(storedWeightValues){
		return storedWeightValues;
    }
	return {
		frequency: 1,
		hasSignificance: 1,
		avgImpactFactor: 1,
		maxImpactFactor: 1,
		pValue: 1,
	};
}

export default function WeightPanel({ updateWeightValues, useButton = false, buttonText = "Record weights", btnCallback = (values) => {}, initialUpdateCall=false }) {
	const [isExpanded, setExpanded] = useState(false);
	const [sliderValues, setSliderValues] = useState(getLocalStorageOrDefaultValues());

	async function saveAndSetWeightValues(newWeightValues){
		localStorage.setItem('blobVizWeightValues', JSON.stringify(newWeightValues));
		setSliderValues(newWeightValues);

		await updateWeightValues(newWeightValues);
	}

	function sliderStateUpdate(name, value) {
		let newValues = { ...sliderValues };
		newValues[name] = parseFloat(value);
		saveAndSetWeightValues(newValues);
	}

	useEffect(() => {
		if(initialUpdateCall) {
			updateWeightValues(sliderValues);
		}
	})

	return (
		<div className='weight_panel'>
			<h2 onClick={() => {
					setExpanded(!isExpanded)
				}}
			>
				Weighting<span className="chevron">{isExpanded ? <i className="gg-chevron-double-up" /> : <i className="gg-chevron-double-down" />}</span>
			</h2>

			{isExpanded ?
				<>
					<h5 style={{marginLeft: 20, marginTop:20}}>Weight Coefficients</h5>
					<div>
						<SliderComponent label='$$F\ \text{(Frequency)}$$ ' value={sliderValues.frequency} onChange={v => sliderStateUpdate('frequency', v)} />
						<SliderComponent label='$$S\ \text{(Has significance)}$$' value={sliderValues.hasSignificance} onChange={v => sliderStateUpdate('hasSignificance', v)} />
						<SliderComponent label='$$I_a\ \text{(Avg impact factor)}$$' value={sliderValues.avgImpactFactor} onChange={v => sliderStateUpdate('avgImpactFactor', v)} />
						<SliderComponent label='$$I_m\ \text{(Max impact factor)}$$' value={sliderValues.maxImpactFactor} onChange={v => sliderStateUpdate('maxImpactFactor', v)} />
						<SliderComponent label='$$p\ \text{(1 - Avg p-value)}$$' value={sliderValues.pValue} onChange={v => sliderStateUpdate('pValue', v)} />
					</div>
					<LatexFormula coefficients={sliderValues} />
					{ useButton ? 
						<Row>
							<Col style={{textAlign: "center"}}>
								<Button
								onClick={
									() => {
										btnCallback(sliderValues);
									}
								}>{ buttonText }</Button>
							</Col>
						</Row> : <></>
					}
				</> : <></>
			}
		</div>
	)
}