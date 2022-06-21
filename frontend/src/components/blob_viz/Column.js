import React from 'react';
import styled from 'styled-components';
import Task from "./Task";
import { Droppable } from 'react-beautiful-dnd';

const Container = styled.div`
    margin: 8px;
    border: 1px solid lightgrey;
    border-radius: 2px;
    min-height: 200px
`;
const Title = styled.h3`
    padding: 8px;
`;
const TaskList = styled.div`
    padding: 8px;
`;


const Column = ({column, tasks, searchText }) => {
    return (
        <Container>
            <Title>{column.title}</Title>
            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <TaskList 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {tasks.map((task, index) => <Task key={task.id.text} searchText={searchText} task={task} index={index} />)}
                        {provided.placeholder}
                    </TaskList>

                )}
            </Droppable>
        </Container>
    );
}

export default Column;