import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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

// Async thunk to fetch beneficiaries
export const fetchBeneficiaries = createAsyncThunk(
  'beneficiary/fetchBeneficiaries',
  async (filters, { rejectWithValue }) => {
    try {
      // Here you would typically make an API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Mock data
      const mockBeneficiaries = [
        {
          id: '1',
          name: 'Priya Sharma',
          age: 25,
          category: 'Pregnant',
          status: 'normal',
          location: 'Mahuva',
          phone: '9876543210',
          lastVisit: '2024-01-15',
          interventions: ['Nutrition Counseling', 'Health Checkup']
        },
        {
          id: '2',
          name: 'Ravi Patel',
          age: 3,
          category: 'Under5',
          status: 'mild',
          location: 'Okpad',
          phone: '9876543211',
          lastVisit: '2024-01-16',
          interventions: ['Vaccination', 'Growth Monitoring']
        },
        {
          id: '3',
          name: 'Sunita Devi',
          age: 16,
          category: 'Adolescent',
          status: 'normal',
          location: 'Chorasi',
          phone: '9876543212',
          lastVisit: '2024-01-14',
          interventions: ['Health Education', 'Iron Supplement']
        }
      ];
      
      return mockBeneficiaries;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to add beneficiary
export const addBeneficiary = createAsyncThunk(
  'beneficiary/addBeneficiary',
  async (beneficiaryData, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      const newBeneficiary = {
        id: Date.now().toString(),
        ...beneficiaryData,
        createdAt: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
      };
      
      return newBeneficiary;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to update beneficiary
export const updateBeneficiary = createAsyncThunk(
  'beneficiary/updateBeneficiary',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      return { id, updates, updatedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to add intervention
export const addIntervention = createAsyncThunk(
  'beneficiary/addIntervention',
  async (interventionData, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      const newIntervention = {
        id: Date.now().toString(),
        ...interventionData,
        createdAt: new Date().toISOString(),
      };
      
      return newIntervention;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const beneficiarySlice = createSlice({
  name: 'beneficiary',
  initialState,
  reducers: {
    setCurrentBeneficiary: (state, action) => {
      state.currentBeneficiary = action.payload;
    },
    clearCurrentBeneficiary: (state) => {
      state.currentBeneficiary = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateBeneficiaryLocal: (state, action) => {
      const index = state.beneficiaries.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.beneficiaries[index] = { ...state.beneficiaries[index], ...action.payload.updates };
      }
    },
    deleteBeneficiary: (state, action) => {
      state.beneficiaries = state.beneficiaries.filter(b => b.id !== action.payload);
      if (state.currentBeneficiary?.id === action.payload) {
        state.currentBeneficiary = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch beneficiaries
      .addCase(fetchBeneficiaries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeneficiaries.fulfilled, (state, action) => {
        state.beneficiaries = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchBeneficiaries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add beneficiary
      .addCase(addBeneficiary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBeneficiary.fulfilled, (state, action) => {
        state.beneficiaries.unshift(action.payload);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(addBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update beneficiary
      .addCase(updateBeneficiary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBeneficiary.fulfilled, (state, action) => {
        const index = state.beneficiaries.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.beneficiaries[index] = { ...state.beneficiaries[index], ...action.payload.updates };
        }
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add intervention
      .addCase(addIntervention.pending, (state) => {
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

// Selectors
export const selectBeneficiaries = (state) => state.beneficiary.beneficiaries;
export const selectCurrentBeneficiary = (state) => state.beneficiary.currentBeneficiary;
export const selectInterventions = (state) => state.beneficiary.interventions;
export const selectBeneficiaryLoading = (state) => state.beneficiary.loading;
export const selectBeneficiaryError = (state) => state.beneficiary.error;
export const selectBeneficiaryFilters = (state) => state.beneficiary.filters;
export const selectLastUpdated = (state) => state.beneficiary.lastUpdated;
export const selectBeneficiaryState = (state) => state.beneficiary;

// Memoized selectors for filtered data
export const selectFilteredBeneficiaries = (state) => {
  const { beneficiaries, filters } = state.beneficiary;
  
  return beneficiaries.filter(beneficiary => {
    // Filter by search query
    if (filters.searchQuery && !beneficiary.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by status
    if (filters.status !== 'all' && beneficiary.status !== filters.status) {
      return false;
    }
    
    // Filter by category
    if (filters.category !== 'all' && beneficiary.category !== filters.category) {
      return false;
    }
    
    // Filter by location
    if (filters.location !== 'all' && beneficiary.location !== filters.location) {
      return false;
    }
    
    return true;
  });
};

export const selectBeneficiariesByCategory = (state) => {
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