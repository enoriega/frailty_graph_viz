import EvidencePanel from "../EvidencePanel";
import React from 'react';
import { Button, Spinner } from "react-bootstrap";
import { fetchEvidence } from "../../utils/api";

const EvidencePanelWrapper = ({ apiUrls, onDataChange=null }) => {
	const [isLoading, setIsLoading] = React.useState(false);
    const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false);
    const [evidenceItems, setEvidenceItems] = React.useState([]);
    const evidenceRef = React.useRef(null);

    const dataUpdated = (newData) => {
        setIsLoading(true);
        // newData: {source, target, polarity}
        fetchEvidence(apiUrls.general, newData.source, newData.target, newData.polarity)
            .then(evidence => {
                evidence.forEach(ev => {
                    ev.impact = parseFloat(ev.impact)
                })
                evidence.sort((a, b) => b.impact - a.impact)
                
                setEvidenceItems(evidence);
                setIsEvidenceOpen(true);
                setIsLoading(false);
                evidenceRef.current.scrollIntoView();
            });
    }


    if(onDataChange) {
        onDataChange(dataUpdated);
    }


    return <>
        {isLoading && <Spinner animation="border" variant="danger" className='loading'/>}
        {isEvidenceOpen &&
            <EvidencePanel
                apiUrl={apiUrls.general}
                items={evidenceItems} header={
                    <h3 ref={evidenceRef}>Evidence:
                        {' '} <Button variant="secondary" size="sm" onClick={() => { setIsEvidenceOpen(false); }}>Close</Button>
                    </h3>
                } />}
    </>
};

export default EvidencePanelWrapper;