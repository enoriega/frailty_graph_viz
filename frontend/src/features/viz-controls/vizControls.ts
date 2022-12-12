import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import Color from 'color'
import { RootState } from '../../app/store'
import { categoryHullColors, categoryNodeColors } from '../../utils/utils'
import { getCategories } from '../../utils/vizapi'

export interface VizControls {
    nodeRadiusScale: "linear" | "logarithmic",
    nodeIds: string[],
    currentView: "root" | "relation",
    categoryDetails: {
        id: string,
        nodeColor: string,
        hullColor: string,
        encoding: number
    }[],
    categoryCounts: {
        [categoryEncoding: number]: number
    },
    interEdgeOpacity: number,
    intraEdgeOpacity: number,
}

const initialState: VizControls = {
    nodeRadiusScale: 'linear',
    nodeIds: ["uniprot:P05231"],
    currentView: "root",
    categoryDetails: [],
    categoryCounts: {},
    interEdgeOpacity: 0.1,
    intraEdgeOpacity: 0.1,
}

export const initCategories = createAsyncThunk<{
    [id:string]: string
}, undefined, { state: RootState }>("vizcontrols/categories/init", async (_, thunkAPI) => {
    // NOTE: If we needed the state, we can use this
    // const state = thunkAPI.getState()
    // const vizControls = state.vizControls
	return await getCategories()
})

export const vizControlsSlice = createSlice({
    name: 'vizControls',
    initialState,
    reducers: {
        setNodeRadiusScale: (state, action: PayloadAction<VizControls["nodeRadiusScale"]>) => {
            state.nodeRadiusScale = action.payload
        },
        setNodeIds: (state, action: PayloadAction<string[]>) => {
            state.nodeIds = action.payload
        },
        setCurrentView: (state, action: PayloadAction<VizControls["currentView"]>) => {
            state.currentView = action.payload
        },
        setIntraEdgeOpacity: (state, action: PayloadAction<VizControls["intraEdgeOpacity"]>) => {
            state.intraEdgeOpacity = action.payload
        },
        setInterEdgeOpacity: (state, action: PayloadAction<VizControls["interEdgeOpacity"]>) => {
            state.interEdgeOpacity = action.payload
        }
    },
    extraReducers: (builder) => {
        builder.addCase(initCategories.pending, (state, action) => {
            state.categoryDetails = []
            state.categoryCounts = {}
        })
        builder.addCase(initCategories.fulfilled, (state, action) => {
            state.categoryDetails = Object.entries(action.payload).map(([k, v]) => ({
                id: v,
                nodeColor: ((categoryNodeColors as {[k: string]: Color})[parseInt(k)+1]).hex(),
                hullColor: ((categoryHullColors as {[k: string]: Color})[parseInt(k)+1]).hex(),
                encoding: parseInt(k)
            }))
            state.categoryCounts =  Object.keys(action.payload).reduce((o, key) => Object.assign(o, {[key]: 5}), {});
        })
        builder.addCase(initCategories.rejected, (state, action) => {
            console.log("ERROR in initializing categories")
            console.log("state: ", state)
            console.log("action: ", action)
        })
    }
})

export const { setNodeRadiusScale, setNodeIds, setCurrentView, setInterEdgeOpacity, setIntraEdgeOpacity } = vizControlsSlice.actions
export const selectVizControls = (state: RootState) => state.vizControls
export const selectNodeSelection = (state: RootState) => state.vizControls.nodeIds
export default vizControlsSlice.reducer
