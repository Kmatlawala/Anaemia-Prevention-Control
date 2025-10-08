// src/utils/role.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'animia:user_role'; // 'Admin' | 'Patient'

export const getRole = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    console.log('getRole: Retrieved from storage:', v);
    return v || null;
  } catch (error) {
    console.error('getRole: Error retrieving role:', error);
    return null;
  }
};

export const setRole = async role => {
  try {
    console.log('setRole: Setting role to:', role);
    console.log('setRole: Role type:', typeof role);
    console.log('setRole: Role stringified:', JSON.stringify(role));

    await AsyncStorage.setItem(KEY, role);
    console.log('setRole: Role set successfully');

    // Verify it was set
    const verify = await AsyncStorage.getItem(KEY);
    console.log('setRole: Verification - stored value:', verify);

    return true;
  } catch (error) {
    console.error('setRole: Error setting role:', error);
    return false;
  }
};

export const clearRole = async () => {
  try {
    console.log('clearRole: Clearing role from storage');
    await AsyncStorage.removeItem(KEY);
    console.log('clearRole: Role cleared successfully');
    return true;
  } catch (error) {
    console.error('clearRole: Error clearing role:', error);
    return false;
  }
};
