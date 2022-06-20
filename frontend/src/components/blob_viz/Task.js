import React from 'react';
import styled from 'styled-components';
import { Draggable } from 'react-beautiful-dnd';
import { categoryHullColors } from '../../utils/utils';
import EntitySearchResultItem from './EntitySearchResultItem';

const Container = styled.div`
    border: 1px solid lightgrey;
    border-radius: 2px;
    padding: 8px;
    margin-bottom: 8px;
    background-color: ${props => (
        // @ts-ignore
        Object.values(categoryHullColors)[props.category-1]
    )};
`;

const Task = ({task, index }) => {

    task = {
        "id": { "text": task.id.text, "matched": "false" },
        "desc": { "text": "InterSomething", "matched": "true" },
        "synonyms": [
            { "text": "InterSyn1", "matched": "false" },
            { "text": "InterSyn2", "matched": "true" },
            { "text": "InterSyn3", "matched": "false" },
        ]
    }


    return (
        <Draggable draggableId={task.id.text} index={index}>
            {(provided, snapshot) => (
                <Container
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    // @ts-ignore
                    category={task.category}
                >
                    <EntitySearchResultItem task={task} />
                </Container>

            )}
        </Draggable>
    )
};

export default Task;