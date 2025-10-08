import { createAction } from '@reduxjs/toolkit';

// Action Types
export const SET_BENEFICIARIES = 'beneficiary/setBeneficiaries';
export const SET_CURRENT_BENEFICIARY = 'beneficiary/setCurrentBeneficiary';
export const ADD_INTERVENTION = 'beneficiary/addIntervention';
export const UPDATE_INTERVENTION = 'beneficiary/updateIntervention';
export const SET_LOADING = 'beneficiary/setLoading';
export const SET_ERROR = 'beneficiary/setError';
export const SET_FILTERS = 'beneficiary/setFilters';
export const RESET_FILTERS = 'beneficiary/resetFilters';

// Action Creators
export const setBeneficiaries = createAction(SET_BENEFICIARIES);
export const setCurrentBeneficiary = createAction(SET_CURRENT_BENEFICIARY);
export const addIntervention = createAction(ADD_INTERVENTION);
export const updateIntervention = createAction(UPDATE_INTERVENTION);
export const setLoading = createAction(SET_LOADING);
export const setError = createAction(SET_ERROR);
export const setFilters = createAction(SET_FILTERS);
export const resetFilters = createAction(RESET_FILTERS);

// Initial State
const initialState = {
  beneficiaries: [],
  currentBeneficiary: null,
  interventions: [],
  loading: false,
  error: null,
  filters: {
    searchQuery: '',
    status: 'all',
    category: 'all',
  }
};

// Reducer
export default function beneficiaryReducer(state = initialState, action) {
  switch (action.type) {
    case SET_BENEFICIARIES:
      return {
        ...state,
        beneficiaries: action.payload,
        loading: false,
        error: null
      };
    case SET_CURRENT_BENEFICIARY:
      return {
        ...state,
        currentBeneficiary: action.payload
      };
    case ADD_INTERVENTION:
      return {
        ...state,
        interventions: [...state.interventions, action.payload]
      };
    case UPDATE_INTERVENTION:
      return {
        ...state,
        interventions: state.interventions.map(intervention => 
          intervention.id === action.payload.id ? action.payload : intervention
        )
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
    default:
      return state;
  }
}

// Selectors
export const selectBeneficiaries = (state) => state.beneficiary.beneficiaries;
export const selectCurrentBeneficiary = (state) => state.beneficiary.currentBeneficiary;
export const selectInterventions = (state) => state.beneficiary.interventions;
export const selectBeneficiaryLoading = (state) => state.beneficiary.loading;
export const selectBeneficiaryError = (state) => state.beneficiary.error;
export const selectBeneficiaryFilters = (state) => state.beneficiary.filters;