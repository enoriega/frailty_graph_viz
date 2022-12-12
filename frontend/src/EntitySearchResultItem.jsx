import React from 'react'
import { Highlighter } from 'react-bootstrap-typeahead'
import { categoryHullColors } from './utils/utils';

function EntitySearchResultItem({ searchText, option, showCategoryColor=false, onClose=()=>{}, cssProps={} }) {
    const synonyms = option.synonyms.map(s => s.text).join(', ')
    const backgroundStyle = {}
    if (showCategoryColor) {
        backgroundStyle['background'] = categoryHullColors[option.category]
    }
    return <div style={{
            ...backgroundStyle,
            ...cssProps,
            padding: "5px",
        }}>
        <button
            type="button"
            className="close"
            aria-label="Close"
            onClick={onClose}
            style={{
                float: "right",
                display: "inline-block",
                padding:"2px 5px",
                background: "#ccc"
            }}
        >X</button>
        <Highlighter search={searchText}>
            {option.desc.text}
        </Highlighter>
        <div>
            <small>
                ID: <Highlighter search={searchText}>
                    {`${option.id.text}`}
                </Highlighter>
                <br />
                Synonyms: <Highlighter search={searchText}>{synonyms}</Highlighter>
                <br />
            </small>
        </div>
        {/* Close button at top right */}
    </div>
}

export default EntitySearchResultItem