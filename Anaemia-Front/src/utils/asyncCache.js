import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_KEYS = {
  BENEFICIARIES: 'cached_beneficiaries',
  CURRENT_BENEFICIARY: 'current_beneficiary',
  INTERVENTIONS: 'cached_interventions',
  SCREENINGS: 'cached_screenings',
  OFFLINE_QUEUE: 'offline_queue',
  CACHE_TIMESTAMP: 'cache_timestamp',
  AUTH_STATE: 'auth_state',
};

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const isCacheExpired = async key => {
  try {
    const timestamp = await AsyncStorage.getItem(`${key}_timestamp`);
    if (!timestamp) return true;

    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    return now - cacheTime > CACHE_EXPIRY_MS;
  } catch (error) {
    return true;
  }
};

const setCacheTimestamp = async key => {
  try {
    await AsyncStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {}
};

export const cacheBeneficiaries = async beneficiaries => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.BENEFICIARIES,
      JSON.stringify(beneficiaries),
    );
    await setCacheTimestamp(CACHE_KEYS.BENEFICIARIES);
  } catch (error) {}
};

export const getCachedBeneficiaries = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.BENEFICIARIES);
    if (cached) {
      const beneficiaries = JSON.parse(cached);
      return beneficiaries;
    }

    return [];
  } catch (error) {
    return [];
  }
};

export const cacheCurrentBeneficiary = async beneficiary => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.CURRENT_BENEFICIARY,
      JSON.stringify(beneficiary),
    );
  } catch (error) {}
};

export const getCachedCurrentBeneficiary = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.CURRENT_BENEFICIARY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

export const cacheInterventions = async interventions => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.INTERVENTIONS,
      JSON.stringify(interventions),
    );
    await setCacheTimestamp(CACHE_KEYS.INTERVENTIONS);
  } catch (error) {}
};

export const getCachedInterventions = async () => {
  try {
    const isExpired = await isCacheExpired(CACHE_KEYS.INTERVENTIONS);
    if (isExpired) {
      return null;
    }

    const cached = await AsyncStorage.getItem(CACHE_KEYS.INTERVENTIONS);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

export const cacheScreenings = async screenings => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.SCREENINGS,
      JSON.stringify(screenings),
    );
    await setCacheTimestamp(CACHE_KEYS.SCREENINGS);
  } catch (error) {}
};

export const getCachedScreenings = async () => {
  try {
    const isExpired = await isCacheExpired(CACHE_KEYS.SCREENINGS);
    if (isExpired) {
      return null;
    }

    const cached = await AsyncStorage.getItem(CACHE_KEYS.SCREENINGS);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

export const addToOfflineQueue = async operation => {
  try {
    const queue = await getOfflineQueue();
    const newOperation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...operation,
    };

    queue.push(newOperation);
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (error) {}
};

export const getOfflineQueue = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    return [];
  }
};

export const removeFromOfflineQueue = async operationId => {
  try {
    const queue = await getOfflineQueue();
    const filteredQueue = queue.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(
      CACHE_KEYS.OFFLINE_QUEUE,
      JSON.stringify(filteredQueue),
    );
  } catch (error) {}
};

export const clearOfflineQueue = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
  } catch (error) {}
};

export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    return false;
  }
};

export const addNetworkListener = callback => {
  return NetInfo.addEventListener(callback);
};

let syncTriggerTimeout = null;
export const triggerSyncWhenOnline = async syncFunction => {
  if (syncTriggerTimeout) {
    clearTimeout(syncTriggerTimeout);
  }

  syncTriggerTimeout = setTimeout(async () => {
    try {
      const online = await isOnline();
      if (online) {
        try {
          await syncFunction();
        } catch (syncError) {}
      } else {
      }
    } catch (error) {}
  }, 2000);
};

export const clearCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.BENEFICIARIES,
      CACHE_KEYS.CURRENT_BENEFICIARY,
      CACHE_KEYS.INTERVENTIONS,
      CACHE_KEYS.SCREENINGS,
      CACHE_KEYS.OFFLINE_QUEUE,
      `${CACHE_KEYS.BENEFICIARIES}_timestamp`,
      `${CACHE_KEYS.INTERVENTIONS}_timestamp`,
      `${CACHE_KEYS.SCREENINGS}_timestamp`,
    ]);
  } catch (error) {}
};

export const cacheAuthState = async authState => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.AUTH_STATE,
      JSON.stringify(authState),
    );
  } catch (error) {}
};

export const getCachedAuthState = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.AUTH_STATE);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

export const getCacheInfo = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      key =>
        key.startsWith('cached_') ||
        key.startsWith('offline_') ||
        key.startsWith('auth_') ||
        key.includes('_timestamp'),
    );

    const info = {
      totalKeys: cacheKeys.length,
      cacheKeys: cacheKeys,
    };

    return info;
  } catch (error) {
    return {totalKeys: 0, cacheKeys: []};
  }
};

export const debugCacheStatus = async () => {
  try {
    const beneficiaries = await getCachedBeneficiaries();
    const queue = await getOfflineQueue();
    const isConnected = await isOnline();

    return {
      beneficiariesCount: beneficiaries.length,
      offlineQueueCount: queue.length,
      isOnline: isConnected,
    };
  } catch (error) {
    return {error: error.message};
  }
};

export default {
  cacheBeneficiaries,
  getCachedBeneficiaries,
  cacheCurrentBeneficiary,
  getCachedCurrentBeneficiary,
  cacheInterventions,
  getCachedInterventions,
  cacheScreenings,
  getCachedScreenings,
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  isOnline,
  addNetworkListener,
  clearCache,
  cacheAuthState,
  getCachedAuthState,
  getCacheInfo,
};
