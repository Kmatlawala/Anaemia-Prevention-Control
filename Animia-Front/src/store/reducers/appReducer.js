import { createAction } from '@reduxjs/toolkit';

export const SET_APP_STATE = 'app/setState';
export const RESET_APP_STATE = 'app/resetState';

export const setAppState = createAction(SET_APP_STATE);
export const resetAppState = createAction(RESET_APP_STATE);

const initialState = {
  value: 0,
  
};

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

export const selectAppState = (state) => state.app;