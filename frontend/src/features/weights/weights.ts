import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { RootState } from '../../app/store'

export interface Weights {
    value: {
        frequency: number,
        hasSignificance: number,
        avgImpactFactor: number,
        maxImpactFactor: number,
        pValue: number,
    }
}

const initialState: Weights = {
    value: {
        frequency: 1,
        hasSignificance: 1,
        avgImpactFactor: 1,
        maxImpactFactor: 1,
        pValue: 1,
    }
}

export const weightsSlice = createSlice({
    name: 'weightsControls',
    initialState,
    reducers: {
        setWeights: (state, action: PayloadAction<Weights["value"]>) => {
            state.value = action.payload
        },
    },
})

export const { setWeights } = weightsSlice.actions
export const selectWeights = (state: RootState) => state.weights.value
export default weightsSlice.reducer
