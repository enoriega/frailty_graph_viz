import React from 'react'
import { Highlighter } from 'react-bootstrap-typeahead'
import { categoryHullColors } from './utils/utils';

function EntitySearchResultItem({ searchText, option, showCategoryColor= false }) {
    const synonyms = option.synonyms.map(s => s.text).join(', ')
    const backgroundStyle = {}
    if (showCategoryColor) {
        backgroundStyle['background'] = categoryHullColors[option.category]
    }
    return <div style={backgroundStyle}>
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
    </div>
}

export default EntitySearchResultItem