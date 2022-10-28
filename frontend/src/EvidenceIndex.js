import React from "react";
import { Form, FloatingLabel, Alert, InputGroup } from "react-bootstrap";
import { Row, Col } from "react-bootstrap";
import { Button } from "react-bootstrap";
import EvidencePanel from "./components/EvidencePanel";
import './index_interface.css';

class QueryBox extends React.Component {

    inputChanged = (e) => {
        this.props.onQueryStrChange(e.target.value.trim());
    }

    maxResultsChanged = (e) => {
        this.props.onMaxResultsChange(e.target.value.trim());
    }



    keyPressed = (e) => {
        if (e.key === 'Enter') {
            this.props.onClick();
        }
    }

    render = () => {
        return (
            < >
                <Alert variant="danger" style={{display: this.props.invalidQuery?"block":"none"}}>
                    Specify a query to proceed.
                </Alert>
                <Row>
                    <Col>
                        <FloatingLabel controlId="floatingQuery" label={this.props.label}>
                            <Form.Control 
                                placeholder={this.props.label}
                                onChange={this.inputChanged}
                                onKeyPress={this.keyPressed} 
                                defaultValue={
                                    this.props.defaults.has("query")?this.props.defaults.get("query"):""
                                }
                            />
                            
                        </FloatingLabel>
                    </Col>
                    <Col xs="auto">
                        <FloatingLabel controlId="floatingNum" label={`Max results`}>
                            <Form.Control
                                min="1"
                                max="10000"
                                type="number" 
                                onChange={this.maxResultsChanged} 
                                onKeyPress={this.keyPressed} 
                                defaultValue={
                                    this.props.defaults.has("size")?this.props.defaults.get("size"):this.props.defaultResults
                                }
                            />
                        </FloatingLabel>
                    </Col>
                    <Col>
                        <Button variant="secondary" onClick={this.props.onClick} size="lg" style={{marginTop: "5px"}}>Search</Button>
                    </Col>
                </Row>
            </>    
        )
    }
}


class EvidenceIndex extends React.Component {

    constructor(props) {
        super(props);

        let params = this.getSearchParams();
        let queryStr = params.has("query") ? params.get("query") : "";
        let size = params.has("size") ? parseInt(params.get("size")) : props.defaultResults;

        this.state = {
            queryStr: queryStr,
            evidence: [],
            size: size,
            start: 0,
        }

        if(queryStr !== "")
            this.fetchQueryResults(queryStr, size, 0);
    }

    clicked = () => {
        const queryStr = this.state.queryStr
        if(queryStr.trim() === ""){
            this.setState({invalidQuery: true});
        }
        else{
            this.setState({invalidQuery: false});
            this.fetchQueryResults(queryStr);
        }
    }

    inputChanged = (query) => {
        this.setState({queryStr: query})
    }

    maxResultsChanged = (maxResults) => {
        this.setState({size: parseInt(maxResults)})
    }

    setSearchParams = (queryStr, size) => {
        let params = new URLSearchParams(window.location.search);
        params.set('query', queryStr);
        params.set('size', size);
        window.history.pushState({}, '', `?${params.toString()}`);
    }

    getSearchParams = () => {
        let params = new URLSearchParams(window.location.search);
        return params
    }


    fetchQueryResults = (queryStr) => {
        let operation = `${this.props.apiUrl}/ir/query/${queryStr}?`

        if("size" in this.state)
            operation += `size=${this.state.size}&`
        if("start" in this.state)
            operation += `start=${this.state.start}&`

            
        this.setSearchParams(queryStr, this.state.size);

        fetch(operation)
            .then(response => response.json())
            .then(results => { 
                this.setState({evidence: results.data})
             })
    }

    render() {
        return (
            <div>
                <QueryBox label="Enter your query"
                    onClick={this.clicked}
                    onQueryStrChange={this.inputChanged}
                    onMaxResultsChange={this.maxResultsChanged}
                    defaultResults={this.props.defaultResults}
                    invalidQuery={this.state.invalidQuery}
                    defaults={this.getSearchParams()}
                />
                <br />
                <br />
                <EvidencePanel
                    apiUrl={ this.props.apiUrl }
                    items={ this.state.evidence }
                    />
                
            </div>
        )
    }
}



export default EvidenceIndex;