import { createAction } from '@reduxjs/toolkit';

// Action Types
export const SET_APP_STATE = 'app/setState';
export const RESET_APP_STATE = 'app/resetState';

// Action Creators
export const setAppState = createAction(SET_APP_STATE);
export const resetAppState = createAction(RESET_APP_STATE);

// Initial State
const initialState = {
  value: 0,
  // Add more app-wide state here
};

// Reducer
export default function appReducer(state = initialState, action) {
  switch (action.type) {
    case SET_APP_STATE:
      return {
        ...state,
        ...action.payload
      };
    case RESET_APP_STATE:
      return initialState;
    default:
      return state;
  }
}

// Selectors
export const selectAppState = (state) => state.app;