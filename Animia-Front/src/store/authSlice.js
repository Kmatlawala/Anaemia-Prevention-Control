import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@animia_auth_state';

// Helper functions for AsyncStorage
const saveAuthState = async authState => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
  } catch (error) {
    console.error('Error saving auth state:', error);
  }
};

const loadAuthState = async () => {
  try {
    const authState = await AsyncStorage.getItem(STORAGE_KEY);
    return authState ? JSON.parse(authState) : null;
  } catch (error) {
    console.error('Error loading auth state:', error);
    return null;
  }
};

const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  role: null,
  token: null,
  error: null,
  isLoading: true,
};

// Async thunk to initialize auth state
export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  const authState = await loadAuthState();
  return authState;
});

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, {rejectWithValue}) => {
    try {
      // Here you would typically make an API call
      // For now, we'll simulate a login
      const {username, password} = credentials;

      if (username && password) {
        const user = {
          id: '1',
          username,
          email: `${username}@example.com`,
          name: username,
        };

        const token = 'mock-jwt-token';
        const role = username === 'admin' ? 'admin' : 'user';

        const authState = {
          isAuthenticated: true,
          user,
          role,
          token,
        };

        await saveAuthState(authState);
        return authState;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.token = action.payload.token;
      state.error = null;
      state.isLoading = false;
      // Save to AsyncStorage
      saveAuthState({
        isAuthenticated: true,
        user: action.payload.user,
        role: action.payload.role,
        token: action.payload.token,
      });
    },
    loginFailure: (state, action) => {
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.token = null;
      state.error = action.payload;
      state.isLoading = false;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.token = null;
      state.error = null;
      state.isLoading = false;
      clearAuthState();
    },
    clearError: state => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, state => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.role = action.payload.role;
          state.token = action.payload.token;
        } else {
          // No stored auth state - user is not authenticated
          state.isAuthenticated = false;
          state.user = null;
          state.role = null;
          state.token = null;
        }
        state.isLoading = false;
      })
      .addCase(initializeAuth.rejected, state => {
        state.isLoading = false;
      })
      // Login user
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.token = action.payload.token;
        state.error = null;
        state.isLoading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.token = null;
        state.error = action.payload;
        state.isLoading = false;
      });
  },
});

export const {loginSuccess, loginFailure, logout, clearError, setLoading} =
  authSlice.actions;

// Selectors
export const selectIsAuthenticated = state => state.auth.isAuthenticated;
export const selectUser = state => state.auth.user;
export const selectRole = state => state.auth.role;
export const selectToken = state => state.auth.token;
export const selectAuthError = state => state.auth.error;
export const selectAuthLoading = state => state.auth.isLoading;
export const selectAuthState = state => state.auth;

export default authSlice.reducer;
