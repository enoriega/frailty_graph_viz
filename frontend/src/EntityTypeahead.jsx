import React from 'react'
import { Typeahead  } from 'react-bootstrap-typeahead';
import EntitySearchResultItem from './EntitySearchResultItem';

function EntityTypeahead({ items, onInputChange, onChange }) {
    return <Typeahead
        id="basic-typeahead-single"
        labelKey={(option) => `${option.desc.text}`}
        onChange={onChange}
        onInputChange={onInputChange}
        paginate={true}
        options={items}
        placeholder="Type an entity name or id..."
        renderMenuItemChildren={
            (option, { text }, index) => {

                return <EntitySearchResultItem searchText={text} option={option} showCategoryColor={false} />
            }
        }
    />
}

export default EntityTypeahead


