import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGIN_SUCCESS, LOGOUT } from '../reducers/authReducer';

const STORAGE_KEY = '@animia_auth_state';

export const persistAuthMiddleware = store => next => action => {
  const result = next(action);

  if (action.type === LOGIN_SUCCESS) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
  } else if (action.type === LOGOUT) {
    AsyncStorage.removeItem(STORAGE_KEY);
  }

  return result;
};

export const loadAuthState = async () => {
  try {
    const authState = await AsyncStorage.getItem(STORAGE_KEY);
    if (authState) {
      return JSON.parse(authState);
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
  }
  return null;
};