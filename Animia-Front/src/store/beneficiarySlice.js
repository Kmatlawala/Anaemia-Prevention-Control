import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {API} from '../utils/api';
import {
  cacheBeneficiaries,
  getCachedBeneficiaries,
  cacheCurrentBeneficiary,
  getCachedCurrentBeneficiary,
  addToOfflineQueue,
  isOnline,
  triggerSyncWhenOnline,
} from '../utils/asyncCache';
import {runSyncOnce} from '../utils/sync';

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
    location: 'all',
    ageGroup: 'all',
  },
  lastUpdated: null,
};

export const fetchBeneficiaries = createAsyncThunk(
  'beneficiary/fetchBeneficiaries',
  async (filters, {rejectWithValue}) => {
    try {
      const online = await isOnline();

      if (online) {
        
        try {
          const beneficiaries = await API.getBeneficiariesWithData();
          await cacheBeneficiaries(beneficiaries);
          return beneficiaries;
        } catch (apiError) {
          
          const cached = await getCachedBeneficiaries();
          if (cached) {
            return cached;
          }
          throw apiError;
        }
      } else {
        
        const cached = await getCachedBeneficiaries();
        
        return cached || [];
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch beneficiaries');
    }
  },
);

export const addBeneficiary = createAsyncThunk(
  'beneficiary/addBeneficiary',
  async (beneficiaryData, {rejectWithValue}) => {
    try {
      const online = await isOnline();

      if (online) {
        
        try {
          const newBeneficiary = await API.createBeneficiary(beneficiaryData);
          return newBeneficiary;
        } catch (apiError) {
          
          await addToOfflineQueue({
            operation: 'CREATE',
            entity: 'beneficiaries',
            payload: beneficiaryData,
          });

          return {
            id: Date.now().toString(),
            ...beneficiaryData,
            createdAt: new Date().toISOString(),
            lastVisit: new Date().toISOString(),
            _pending: true, 
          };
        }
      } else {
        
        await addToOfflineQueue({
          operation: 'CREATE',
          entity: 'beneficiaries',
          payload: beneficiaryData,
        });

        const localBeneficiary = {
          id: Date.now().toString(),
          ...beneficiaryData,
          createdAt: new Date().toISOString(),
          lastVisit: new Date().toISOString(),
          _pending: true, 
        };

        triggerSyncWhenOnline(async () => {
          await runSyncOnce();
        });

        return localBeneficiary;
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add beneficiary');
    }
  },
);

export const updateBeneficiary = createAsyncThunk(
  'beneficiary/updateBeneficiary',
  async ({id, updates}, {rejectWithValue}) => {
    try {
      const online = await isOnline();

      if (online) {
        
        try {
          const updatedBeneficiary = await API.updateBeneficiary(id, updates);
          return {
            id,
            updates: updatedBeneficiary,
            updatedAt: new Date().toISOString(),
          };
        } catch (apiError) {
          
          await addToOfflineQueue({
            operation: 'UPDATE',
            entity: 'beneficiaries',
            payload: {id, updates},
          });

          return {
            id,
            updates: {...updates, _pending: true},
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        
        await addToOfflineQueue({
          operation: 'UPDATE',
          entity: 'beneficiaries',
          payload: {id, updates},
        });

        const localUpdate = {
          id,
          updates: {...updates, _pending: true},
          updatedAt: new Date().toISOString(),
        };

        triggerSyncWhenOnline(async () => {
          await runSyncOnce();
        });

        return localUpdate;
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update beneficiary');
    }
  },
);

export const addIntervention = createAsyncThunk(
  'beneficiary/addIntervention',
  async (interventionData, {rejectWithValue}) => {
    try {
      const online = await isOnline();

      if (online) {
        
        try {
          const newIntervention = await API.addIntervention(
            interventionData.beneficiaryId,
            interventionData,
          );
          return newIntervention;
        } catch (apiError) {
          
          await addToOfflineQueue({
            operation: 'CREATE',
            entity: 'interventions',
            payload: interventionData,
          });

          return {
            id: Date.now().toString(),
            ...interventionData,
            createdAt: new Date().toISOString(),
            _pending: true, 
          };
        }
      } else {
        
        await addToOfflineQueue({
          operation: 'CREATE',
          entity: 'interventions',
          payload: interventionData,
        });

        const localIntervention = {
          id: Date.now().toString(),
          ...interventionData,
          createdAt: new Date().toISOString(),
          _pending: true, 
        };

        triggerSyncWhenOnline(async () => {
          await runSyncOnce();
        });

        return localIntervention;
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add intervention');
    }
  },
);

export const addScreening = createAsyncThunk(
  'beneficiary/addScreening',
  async (screeningData, {rejectWithValue}) => {
    try {
      const online = await isOnline();

      if (online) {
        
        try {
          const newScreening = await API.addScreening(
            screeningData.beneficiaryId,
            screeningData,
          );
          return newScreening;
        } catch (apiError) {
          
          await addToOfflineQueue({
            operation: 'CREATE',
            entity: 'screenings',
            payload: screeningData,
          });

          return {
            id: Date.now().toString(),
            ...screeningData,
            createdAt: new Date().toISOString(),
            _pending: true, 
          };
        }
      } else {
        
        await addToOfflineQueue({
          operation: 'CREATE',
          entity: 'screenings',
          payload: screeningData,
        });

        const localScreening = {
          id: Date.now().toString(),
          ...screeningData,
          createdAt: new Date().toISOString(),
          _pending: true, 
        };

        triggerSyncWhenOnline(async () => {
          await runSyncOnce();
        });

        return localScreening;
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add screening');
    }
  },
);

export const loadCachedData = createAsyncThunk(
  'beneficiary/loadCachedData',
  async (_, {rejectWithValue}) => {
    try {
      const [cachedBeneficiaries, cachedCurrentBeneficiary] = await Promise.all(
        [getCachedBeneficiaries(), getCachedCurrentBeneficiary()],
      );

      return {
        beneficiaries: cachedBeneficiaries || [],
        currentBeneficiary: cachedCurrentBeneficiary,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load cached data');
    }
  },
);

const beneficiarySlice = createSlice({
  name: 'beneficiary',
  initialState,
  reducers: {
    setCurrentBeneficiary: (state, action) => {
      state.currentBeneficiary = action.payload;
      
      if (action.payload) {
        cacheCurrentBeneficiary(action.payload);
      }
    },
    clearCurrentBeneficiary: state => {
      state.currentBeneficiary = null;
      
      cacheCurrentBeneficiary(null);
    },
    setFilters: (state, action) => {
      state.filters = {...state.filters, ...action.payload};
    },
    resetFilters: state => {
      state.filters = initialState.filters;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: state => {
      state.error = null;
    },
    updateBeneficiaryLocal: (state, action) => {
      const index = state.beneficiaries.findIndex(
        b => b.id === action.payload.id,
      );
      if (index !== -1) {
        state.beneficiaries[index] = {
          ...state.beneficiaries[index],
          ...action.payload.updates,
        };
      }
    },
    deleteBeneficiary: (state, action) => {
      state.beneficiaries = state.beneficiaries.filter(
        b => b.id !== action.payload,
      );
      if (state.currentBeneficiary?.id === action.payload) {
        state.currentBeneficiary = null;
      }
    },
  },
  extraReducers: builder => {
    builder
      
      .addCase(fetchBeneficiaries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeneficiaries.fulfilled, (state, action) => {
        state.beneficiaries = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();

        cacheBeneficiaries(action.payload);
      })
      .addCase(fetchBeneficiaries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(addBeneficiary.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBeneficiary.fulfilled, (state, action) => {
        state.beneficiaries.unshift(action.payload);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();

        cacheBeneficiaries(state.beneficiaries);
      })
      .addCase(addBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(updateBeneficiary.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBeneficiary.fulfilled, (state, action) => {
        const index = state.beneficiaries.findIndex(
          b => b.id === action.payload.id,
        );
        if (index !== -1) {
          state.beneficiaries[index] = {
            ...state.beneficiaries[index],
            ...action.payload.updates,
          };
        }
        state.loading = false;
        state.lastUpdated = new Date().toISOString();

        cacheBeneficiaries(state.beneficiaries);
      })
      .addCase(updateBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(addIntervention.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIntervention.fulfilled, (state, action) => {
        state.interventions.unshift(action.payload);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(addIntervention.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(addScreening.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addScreening.fulfilled, (state, action) => {
        
        state.interventions.unshift(action.payload);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(addScreening.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(loadCachedData.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCachedData.fulfilled, (state, action) => {
        state.beneficiaries = action.payload.beneficiaries;
        state.currentBeneficiary = action.payload.currentBeneficiary;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(loadCachedData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setCurrentBeneficiary,
  clearCurrentBeneficiary,
  setFilters,
  resetFilters,
  setLoading,
  setError,
  clearError,
  updateBeneficiaryLocal,
  deleteBeneficiary,
} = beneficiarySlice.actions;

export const selectBeneficiaries = state => state.beneficiary.beneficiaries;
export const selectCurrentBeneficiary = state =>
  state.beneficiary.currentBeneficiary;
export const selectInterventions = state => state.beneficiary.interventions;
export const selectBeneficiaryLoading = state => state.beneficiary.loading;
export const selectBeneficiaryError = state => state.beneficiary.error;
export const selectBeneficiaryFilters = state => state.beneficiary.filters;
export const selectLastUpdated = state => state.beneficiary.lastUpdated;
export const selectBeneficiaryState = state => state.beneficiary;

export const selectFilteredBeneficiaries = state => {
  const {beneficiaries, filters} = state.beneficiary;

  return beneficiaries.filter(beneficiary => {
    
    if (
      filters.searchQuery &&
      !beneficiary.name
        .toLowerCase()
        .includes(filters.searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filters.status !== 'all' && beneficiary.status !== filters.status) {
      return false;
    }

    if (
      filters.category !== 'all' &&
      beneficiary.category !== filters.category
    ) {
      return false;
    }

    if (
      filters.location !== 'all' &&
      beneficiary.location !== filters.location
    ) {
      return false;
    }

    return true;
  });
};

export const selectBeneficiariesByCategory = state => {
  const beneficiaries = selectFilteredBeneficiaries(state);
  return beneficiaries.reduce((acc, beneficiary) => {
    const category = beneficiary.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(beneficiary);
    return acc;
  }, {});
};

export default beneficiarySlice.reducer;
