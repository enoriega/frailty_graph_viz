import {Typeahead, Highlighter, Token} from 'react-bootstrap-typeahead';
import {Row, Form, Col, Button, Accordion} from "react-bootstrap";
import {useState, Fragment, useEffect} from "react";
import EvidencePanel from "./components/EvidencePanel";
import {fetchEntities, fetchInteractionTypes, fetchNeighbots, structuredSearch} from "./utils/api";
import { groupBy } from "./utils/utils";

function EntityTypeahead({ items, onChange }){

  return <Typeahead
            id="basic-typeahead-single"
            labelKey={ (option) => `${option.label} (id ${option.id})`}
            onChange={onChange}
            options={items}
            placeholder="Choose an entity..."
            // multiple
            renderMenuItemChildren={
              (option, { text }, index) => {
                return <>
                  <Highlighter search={text}>
                    {option.label}
                  </Highlighter>
                  <div>
                    <small>
                      <Highlighter search={text}>
                        {`${option.id}`}
                      </Highlighter>
                        <br />
                        {option.type}
                    </small>
                  </div>
                </>
              }
            }

            // renderToken={
            //     (option, { onRemove }, index) =>
            //         <Token
            //           key={index}
            //           onRemove={onRemove}
            //           option={option}>
            //           {/*{`${option.label} (id: ${option.id})`}*/}
            //             Test
            //         </Token>
            //
            // }
        />
}

export default function StructuredSearch({ apiUrl }){
    const [controllers, setControllers] = useState([])
    const [controlleds, setControlleds] = useState([])
    const [chosenController, setChosenController]  = useState()
    const [chosenControlled, setChosenControlled]  = useState()
    const [allEntities, setAllEntities] = useState([]);

    const [groupedMatches, setGroupedMatches] = useState({});



    // Fetch the data after rendering
    useEffect(async () => {
        const entities = await fetchEntities(apiUrl);

        setControllers(entities);
        setControlleds(entities);
        setAllEntities(entities);
    },  [])

    const sortedGroups = Object.keys(groupedMatches).sort().reverse()

    const accordionPanels = sortedGroups.map(
        (group) => {
            const elems = groupedMatches[group];
            return (
                <Accordion.Item eventKey={group} key={group}>
                    <Accordion.Header>{
                        group.split('_')
                        .map(
                            ([initial, ...rest]) =>
                                [initial.toUpperCase(), ...rest].join("")).join(" ")
                    } ({elems.length})</Accordion.Header>
                    <Accordion.Body>
                        <EvidencePanel
                            apiUrl={apiUrl}
                            items={elems}
                        />
                    </Accordion.Body>
                </Accordion.Item>
            )
        }

    )

    // Helper higher-order function to restrict the choices in the reciprocal entity box to those who have recults
    const adjustParticipants =
        (setChosenParticipant, setReciprocals) => function(choice){
          if(choice.length > 0) {
              // Piggyback on this api call from the NetworkViz page
              fetchNeighbots(apiUrl, choice[0]['id'])
              .then((reciprocals) => {
                  // Remove all those virtual elements that represent edges
                  reciprocals = reciprocals.map((e) => e["data"]).filter((e) => !("source" in e));
                  // Set the component state
                  setChosenParticipant(choice)
                  setReciprocals(reciprocals)
              })
          }
          else{
              setReciprocals(allEntities);
              setChosenParticipant(null);
          }
      }


    return (
        <>
            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Controller Entity</Form.Label>
                  <EntityTypeahead items={controllers} onChange={
                      adjustParticipants(setChosenController, setControlleds)
                  } />
                </Form.Group>
              </Col>

              <Col>
              <Form.Group>
                <Form.Label>Controlled Entity</Form.Label>
                <EntityTypeahead items={controlleds} onChange={adjustParticipants(setChosenControlled, setControllers)} />
              </Form.Group>
              </Col>
              <Col>
                <Button
                    style={{
                        position:"relative",
                        top: "2em"
                    }}
                    variant="secondary"
                    onClick={ async () => {
                        let [__, s_matches] = await structuredSearch(apiUrl, chosenController[0].id, chosenControlled[0].id)

                        const results = groupBy(s_matches, (m) => m["event_type"])
                        setGroupedMatches(results)
                    }}
                >Search</Button>
              </Col>
            </Row>
            <br />
            <Accordion defaultActiveKey="exact">
                { accordionPanels }
            </Accordion>

        </>
    );
}