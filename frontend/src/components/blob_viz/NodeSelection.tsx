import React from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectNodeSelection } from '../../features/viz-controls/vizControls';
import AsyncSelect from 'react-select/async';


const NodeSelection = () => {
    // Redux states
    const dispatch = useAppDispatch();
    const vizControls = useAppSelector(selectNodeSelection)

    const [options, setOptions] = React.useState<Node[]>([])

    return <AsyncSelect
        options={options}
        loadOptions={(inputVal) => {
            // fetch from api
            const newOptions: typeof options = []
            setOptions(newOptions)
        }}
    />

}

export default NodeSelection