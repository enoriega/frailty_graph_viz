import React from 'react';
import { DragDropContext } from "react-beautiful-dnd";
import Column from "./Column";
    

const EntityAutoComplete = ({ updateSelectedNode, apiUrl, initialPinnedNodes }) => {

    const [dataState, setDataState] = React.useState({
        tasks: initialPinnedNodes.map(node => ({
            "id": { "text": node.id, "matched": "false" },
            "desc": { "text": node.label, "matched": "true" },
            "synonyms": []
        })),
        columns: {
            'column-1': {
                id: 'column-1',
                title: 'Search Result',
                taskIds: [],
            },
            'column-2': {
                id: 'column-2',
                title: 'Pinned',
                taskIds: [initialPinnedNodes.map(node => node.id)],
            }
        },
        columnOrder: ['column-1', 'column-2']
    });

    const handleChange = (event) => {
        if (event.target.value.length === 0) return;

        fetch(`${apiUrl}/searchnode/${event.target.value}/5`).then(response => response.json()).then(suggestions => {
            suggestions = suggestions['matches'];
            const tasksList = dataState.columns["column-2"].taskIds.map(taskId => dataState.tasks.find(task => task.text.id === taskId));
            const allTasks = tasksList.concat(suggestions);

            const newState = {
                ...dataState,
                tasks: allTasks,
            }
            newState.columns["column-1"].taskIds = suggestions.map(task => task.id.text);
            setDataState(newState);
        });
    }

    const onDragEnd = result => {
        const {destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const start = dataState.columns[source.droppableId];
        const finish = dataState.columns[destination.droppableId];

        if (start === finish) {
            const newTaskIds = Array.from(start.taskIds);
            newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, draggableId);

            const newColumn = {
                ...start,
                taskIds: newTaskIds
            }
            const newState = {
                ...dataState,
                columns: {
                    ...dataState.columns,
                    [newColumn.id]: newColumn,
                },
            }
            setDataState(newState);
            return;
        }
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
        const newState = {
            ...dataState,
            columns: {
                ...dataState.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            }
        };
        setDataState(newState);
    }

    React.useEffect(() => {
        updateSelectedNode(dataState.columns['column-2'].taskIds);
    }, [dataState]);

    return <div>
        <div className="form-floating mb-3">
            <input type="search" className="form-control" id="entity_name" placeholder="Interleukin-6" aria-label="Enter Name or ID of entity" onChange={handleChange} />
            <label htmlFor="entity_name">Search for Entity</label>
        </div>

        <DragDropContext
            onDragEnd={onDragEnd}
        >
            {dataState.columnOrder.map(columnId => {
                const column = dataState.columns[columnId];
                const tasks = column.taskIds.map(taskId => dataState.tasks.find(task => task.id.text === taskId)).filter(task => task);
                return <Column key={column.id} column={column} tasks={tasks} />
            })}
        </DragDropContext>
    </div>
}

export default EntityAutoComplete;