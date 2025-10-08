import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  isOnline: true,
  isInitialized: false,
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  sync: {
    isSyncing: false,
    lastSync: null,
    syncError: null,
  },
  loading: false,
  error: null,
};

// Async thunk to initialize app
export const initializeApp = createAsyncThunk(
  'app/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Here you would typically initialize app settings, load user preferences, etc.
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization
      
      return {
        isInitialized: true,
        theme: 'light',
        language: 'en',
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to sync data
export const syncData = createAsyncThunk(
  'app/syncData',
  async (_, { rejectWithValue }) => {
    try {
      // Here you would typically sync data with server
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate sync
      
      return {
        lastSync: new Date().toISOString(),
        syncError: null,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    updateNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
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
    setSyncStatus: (state, action) => {
      state.sync.isSyncing = action.payload;
    },
    setSyncError: (state, action) => {
      state.sync.syncError = action.payload;
      state.sync.isSyncing = false;
    },
    clearSyncError: (state) => {
      state.sync.syncError = null;
    },
    resetApp: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize app
      .addCase(initializeApp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.isInitialized = true;
        state.theme = action.payload.theme;
        state.language = action.payload.language;
        state.loading = false;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sync data
      .addCase(syncData.pending, (state) => {
        state.sync.isSyncing = true;
        state.sync.syncError = null;
      })
      .addCase(syncData.fulfilled, (state, action) => {
        state.sync.isSyncing = false;
        state.sync.lastSync = action.payload.lastSync;
        state.sync.syncError = null;
      })
      .addCase(syncData.rejected, (state, action) => {
        state.sync.isSyncing = false;
        state.sync.syncError = action.payload;
      });
  },
});

export const {
  setOnlineStatus,
  setTheme,
  setLanguage,
  updateNotifications,
  setLoading,
  setError,
  clearError,
  setSyncStatus,
  setSyncError,
  clearSyncError,
  resetApp,
} = appSlice.actions;

// Selectors
export const selectIsOnline = (state) => state.app.isOnline;
export const selectIsInitialized = (state) => state.app.isInitialized;
export const selectTheme = (state) => state.app.theme;
export const selectLanguage = (state) => state.app.language;
export const selectNotifications = (state) => state.app.notifications;
export const selectSyncStatus = (state) => state.app.sync;
export const selectAppLoading = (state) => state.app.loading;
export const selectAppError = (state) => state.app.error;
export const selectAppState = (state) => state.app;

export default appSlice.reducer;