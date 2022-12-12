import EvidencePanel from "../EvidencePanel"
import React from 'react'
import { Button, Spinner } from "react-bootstrap"
import { fetchEvidence } from "../../utils/api"
import config from "../../config.json"

const EvidencePanelWrapper = ({ onDataChange=null }: {
    onDataChange: null|((newData: {source: string, target: string, polarity: string}) => void)
}) => {
	const [isLoading, setIsLoading] = React.useState(false);
    const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false);
    const [evidenceItems, setEvidenceItems] = React.useState([]);
    const evidenceRef = React.useRef<HTMLHeadingElement>(null);

    const dataUpdated = (newData: {source: string, target: string, polarity: string}) => {
        setIsLoading(true);
        // newData: {source, target, polarity}
        fetchEvidence(config.apiUrl, newData.source, newData.target, newData.polarity)
            .then(evidence => {
                evidence.forEach((ev: any) => {
                    ev.impact = parseFloat(ev.impact)
                })
                evidence.sort((a: {impact: number}, b: {impact: number}) => b.impact - a.impact)
                
                setEvidenceItems(evidence);
                setIsEvidenceOpen(true);
                setIsLoading(false);
                if(evidenceRef.current)
                    evidenceRef.current.scrollIntoView();
            });
    }


    if(onDataChange) {
        // TODO: Fix this
        // onDataChange(dataUpdated);
    }


    return <>
        {isLoading && <Spinner animation="border" variant="danger" className='loading'/>}
        {isEvidenceOpen &&
            <EvidencePanel
                apiUrl={config.apiUrl}
                items={evidenceItems} header={
                    <h3 ref={evidenceRef}>Evidence:
                        {' '} <Button variant="secondary" size="sm" onClick={() => { setIsEvidenceOpen(false); }}>Close</Button>
                    </h3>
                } />}
    </>
};

export default EvidencePanelWrapper;