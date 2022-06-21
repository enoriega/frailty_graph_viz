import React from 'react';
import { DragDropContext } from "react-beautiful-dnd";
import Column from "./Column";
    

const EntityAutoComplete = ({ updateSelectedNode, apiUrls, initialPinnedNodes }) => {

    const [dataState, setDataState] = React.useState({
        tasks: initialPinnedNodes.map(node => ({
            id: { text: node.id, matched: false },
            desc: { text: node.label, matched: true },
            synonyms: [],
            category: node.category
        })),
        columns: {
            searchCol: {
                id: 'searchCol',
                title: 'Search Result',
                taskIds: []
            },
            pinCol: {
                id: 'pinCol',
                title: 'Pinned',
                taskIds: initialPinnedNodes.map(node => node.id)
            }
        }
    });

    const columnOrder = ['searchCol', 'pinCol'];
    const [searchValue, setSearchValue] = React.useState('');

    const handleChange = (event) => {
        const value = event.target.value;
        setSearchValue(value);

        if (event.target.value.length <= 2) return;

        const pinColTasks = dataState.tasks.filter(task => dataState.columns['pinCol'].taskIds.includes(task.id.text));

        fetch(`${apiUrls.general}/search_entity/${value}`).then(response => response.json()).then(result => {
            result = result.slice(0, 6)

            const suggestions = result.filter(entity => !dataState.columns['pinCol'].taskIds.includes(entity.id.text));

            setDataState({
                tasks: [
                    ...pinColTasks,
                    ...suggestions
                ],
                columns: {
                    pinCol: dataState.columns['pinCol'],
                    searchCol: {
                        id: 'searchCol',
                        title: 'Search Result',
                        taskIds: suggestions.map(entity => entity.id.text)
                    }
                }
            })
        });
    }

    const onDragEnd = result => {
        const {destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId) return;

        const start = dataState.columns[source.droppableId];
        const finish = dataState.columns[destination.droppableId];
        if (start === finish) return;

        const startTaskIds = Array.from(start.taskIds);
        startTaskIds.splice(source.index, 1);
        const newStart = {
            ...start,
            taskIds: startTaskIds,
        };
        const finishTaskIds = Array.from(finish.taskIds);
        finishTaskIds.splice(destination.index, 0, draggableId);
        const newFinish = {
            ...finish,
            taskIds: finishTaskIds,
        }

        setDataState({
            ...dataState,
            columns: {
                ...dataState.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            }
        })

        updateSelectedNode(newFinish.taskIds);
    }

    return <div>
        <div className="form-floating mb-3">
            <input type="search" className="form-control" id="entity_name" aria-label="Enter Name or ID of entity" onChange={handleChange} value={searchValue} />
            <label htmlFor="entity_name">Search for Entity</label>
        </div>

        <DragDropContext
            onDragEnd={onDragEnd}
        >
            {columnOrder.map(columnId => {
                const column = dataState.columns[columnId];
                const myTasks = column.taskIds.map(taskId => dataState.tasks.find(task => task.id.text === taskId));
                return <Column key={column.id} column={column} tasks={myTasks} searchText={searchValue} />;
            })}
        </DragDropContext>
    </div>
}

export default EntityAutoComplete;