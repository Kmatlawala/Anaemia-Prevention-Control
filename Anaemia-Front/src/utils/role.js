import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'anaemia:user_role';

export const getRole = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v || null;
  } catch (error) {
    return null;
  }
};

export const setRole = async role => {
  try {
    await AsyncStorage.setItem(KEY, role);
    return true;
  } catch (error) {
    return false;
  }
};

export const clearRole = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch (error) {
    return false;
  }
};
