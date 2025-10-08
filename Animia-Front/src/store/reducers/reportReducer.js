import { createAction } from '@reduxjs/toolkit';

// Action Types
export const SET_FILTERS = 'report/setFilters';
export const RESET_FILTERS = 'report/resetFilters';
export const SET_CURRENT_REPORT = 'report/setCurrentReport';
export const SET_LOADING = 'report/setLoading';
export const SET_ERROR = 'report/setError';

// Action Creators
export const setFilters = createAction(SET_FILTERS);
export const resetFilters = createAction(RESET_FILTERS);
export const setCurrentReport = createAction(SET_CURRENT_REPORT);
export const setLoading = createAction(SET_LOADING);
export const setError = createAction(SET_ERROR);

// Initial State
const initialState = {
  filters: {
    dateRange: {
      startDate: null,
      endDate: null,
    },
    beneficiaryType: 'all',
    interventionStatus: 'all',
    location: null,
    ageGroup: 'all',
    gender: 'all',
  },
  currentReport: null,
  loading: false,
  error: null,
};

// Reducer
export default function reportReducer(state = initialState, action) {
  switch (action.type) {
    case SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case RESET_FILTERS:
      return {
        ...state,
        filters: initialState.filters
      };
    case SET_CURRENT_REPORT:
      return {
        ...state,
        currentReport: action.payload,
        loading: false
      };
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    default:
      return state;
  }
}

// Selectors
export const selectReportFilters = (state) => state.report.filters;
export const selectCurrentReport = (state) => state.report.currentReport;
export const selectReportLoading = (state) => state.report.loading;
export const selectReportError = (state) => state.report.error;