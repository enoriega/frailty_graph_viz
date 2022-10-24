import { MathJaxContext, MathJax } from 'better-react-mathjax';
import RangeSlider from 'react-bootstrap-range-slider';
import { Form, Row, Col } from 'react-bootstrap';
import { useState } from 'react';

export default function SliderComponent({ label, value, max, granularity, onChange }) {

	const [currentValue, setCurrentValue] = useState(value);

	if (!max)
		max = 10;

	if (!granularity)
		granularity = .1;

	return (
		<Form>
			<Form.Group as={Row}>
				<Col>
					<Form.Label>
						<MathJaxContext>
							<MathJax dynamic={true}>{label}</MathJax>
						</MathJaxContext>
					</Form.Label>
				</Col>
				<Col xs={9}>
					<RangeSlider
						value={currentValue}
						min={1}
						max={max}
						step={granularity}
						tooltip='off'
						onChange={e => setCurrentValue(e.target.value)}
						onAfterChange={e => {
							if (onChange)
								onChange(currentValue);
						}
						}
					/>
				</Col>
				<Col xs={1}>
					<Form.Control type="number" value={currentValue}
						onChange={e => {
							setCurrentValue(e.target.value);
							if (onChange)
								onChange(e.target.value);
						}}
					/>
				</Col>
			</Form.Group>
		</Form>
	);
}