import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH: '@animia_auth_state',
};

export const saveAuthState = async (authState) => {
  try {
    const jsonValue = JSON.stringify(authState);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH, jsonValue);
  } catch (error) {
    }
};

export const loadAuthState = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.AUTH);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    return null;
  }
};

export const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH);
  } catch (error) {
    }
};