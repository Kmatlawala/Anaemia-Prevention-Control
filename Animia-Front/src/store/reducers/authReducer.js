import { createAction } from '@reduxjs/toolkit';

// Action Types
export const LOGIN_SUCCESS = 'auth/loginSuccess';
export const LOGIN_FAILURE = 'auth/loginFailure';
export const LOGOUT = 'auth/logout';
export const AUTH_INITIALIZED = 'auth/initialized';

// Action Creators
export const loginSuccess = createAction(LOGIN_SUCCESS);
export const loginFailure = createAction(LOGIN_FAILURE);
export const logout = createAction(LOGOUT);
export const authInitialized = createAction(AUTH_INITIALIZED);

// Initial State
const initialState = {
  isAuthenticated: false,
  user: null,
  role: null,
  token: null,
  error: null,
  isLoading: false,
  isInitialized: false
};

// Reducer
export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        role: action.payload.role,
        token: action.payload.token,
        error: null,
        isLoading: false,
        isInitialized: true
      };
    case LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        role: null,
        token: null,
        error: action.payload,
        isLoading: false,
        isInitialized: true
      };
    case AUTH_INITIALIZED:
      return {
        ...state,
        isInitialized: true,
        isLoading: false
      };
    case LOGOUT:
      return {
        ...initialState
      };
    default:
      return state;
  }
}

// Selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectRole = (state) => state.auth.role;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectIsInitialized = (state) => state.auth.isInitialized;