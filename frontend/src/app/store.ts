import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit'
import vizControlsReducer from '../features/viz-controls/vizControls'
import weightsReducer from '../features/weights/weights'

export const store = configureStore({
  reducer: {
    vizControls: vizControlsReducer,
    weights: weightsReducer
  },
})

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
