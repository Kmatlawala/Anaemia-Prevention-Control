import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import dayjs from 'dayjs';

const initialState = {
  filters: {
    dateRange: {
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    },
    beneficiaryType: 'all',
    interventionStatus: 'all',
    location: 'all',
    ageGroup: 'all',
    gender: 'all',
  },
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

export const fetchReports = createAsyncThunk(
  'report/fetchReports',
  async (filters, {rejectWithValue}) => {
    try {

      await new Promise(resolve => setTimeout(resolve, 1000)); 

      const mockReports = [
        {
          id: '1',
          beneficiaryName: 'Test Beneficiary 1',
          category: 'Pregnant',
          status: 'normal',
          location: 'Mahuva',
          date: '2024-01-15',
          interventions: ['Nutrition Counseling', 'Health Checkup'],
        },
        {
          id: '2',
          beneficiaryName: 'Test Beneficiary 2',
          category: 'Under5',
          status: 'mild',
          location: 'Olpad',
          date: '2024-01-16',
          interventions: ['Vaccination', 'Growth Monitoring'],
        },
      ];

      return mockReports;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const generateReport = createAsyncThunk(
  'report/generateReport',
  async (reportData, {rejectWithValue}) => {
    try {
      
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const report = {
        id: Date.now().toString(),
        ...reportData,
        generatedAt: new Date().toISOString(),
        status: 'completed',
      };

      return report;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = {...state.filters, ...action.payload};
    },
    resetFilters: state => {
      state.filters = initialState.filters;
    },
    setCurrentReport: (state, action) => {
      state.currentReport = action.payload;
    },
    clearCurrentReport: state => {
      state.currentReport = null;
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
    updateReport: (state, action) => {
      const index = state.reports.findIndex(
        report => report.id === action.payload.id,
      );
      if (index !== -1) {
        state.reports[index] = {...state.reports[index], ...action.payload};
      }
    },
    deleteReport: (state, action) => {
      state.reports = state.reports.filter(
        report => report.id !== action.payload,
      );
    },
  },
  extraReducers: builder => {
    builder
      
      .addCase(fetchReports.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reports = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(generateReport.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.currentReport = action.payload;
        state.reports.unshift(action.payload);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  setCurrentReport,
  clearCurrentReport,
  setLoading,
  setError,
  clearError,
  updateReport,
  deleteReport,
} = reportSlice.actions;

export const selectReportFilters = state => state.report.filters;
export const selectReports = state => state.report.reports;
export const selectCurrentReport = state => state.report.currentReport;
export const selectReportLoading = state => state.report.loading;
export const selectReportError = state => state.report.error;
export const selectLastUpdated = state => state.report.lastUpdated;
export const selectReportState = state => state.report;

export const selectFilteredReports = state => {
  const {reports, filters} = state.report;

  return reports.filter(report => {
    
    if (
      filters.beneficiaryType !== 'all' &&
      report.category !== filters.beneficiaryType
    ) {
      return false;
    }

    if (
      filters.interventionStatus !== 'all' &&
      report.status !== filters.interventionStatus
    ) {
      return false;
    }

    if (filters.location !== 'all' && report.location !== filters.location) {
      return false;
    }

    if (
      filters.dateRange.startDate &&
      report.date < filters.dateRange.startDate
    ) {
      return false;
    }

    if (filters.dateRange.endDate && report.date > filters.dateRange.endDate) {
      return false;
    }

    return true;
  });
};

export default reportSlice.reducer;
