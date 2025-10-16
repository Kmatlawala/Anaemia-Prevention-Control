// src/utils/asyncCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache keys
const CACHE_KEYS = {
  BENEFICIARIES: 'cached_beneficiaries',
  CURRENT_BENEFICIARY: 'current_beneficiary',
  INTERVENTIONS: 'cached_interventions',
  SCREENINGS: 'cached_screenings',
  OFFLINE_QUEUE: 'offline_queue',
  CACHE_TIMESTAMP: 'cache_timestamp',
  AUTH_STATE: 'auth_state',
};

// Cache expiry time (24 hours)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Helper function to check if cache is expired
const isCacheExpired = async key => {
  try {
    const timestamp = await AsyncStorage.getItem(`${key}_timestamp`);
    if (!timestamp) return true;

    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    return now - cacheTime > CACHE_EXPIRY_MS;
  } catch (error) {
    console.warn('[AsyncCache] Error checking cache expiry:', error);
    return true;
  }
};

// Helper function to set cache timestamp
const setCacheTimestamp = async key => {
  try {
    await AsyncStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.warn('[AsyncCache] Error setting cache timestamp:', error);
  }
};

// Cache beneficiaries
export const cacheBeneficiaries = async beneficiaries => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.BENEFICIARIES,
      JSON.stringify(beneficiaries),
    );
    await setCacheTimestamp(CACHE_KEYS.BENEFICIARIES);
    console.log('[AsyncCache] Beneficiaries cached successfully');
  } catch (error) {
    console.error('[AsyncCache] Error caching beneficiaries:', error);
  }
};

// Get cached beneficiaries
export const getCachedBeneficiaries = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.BENEFICIARIES);
    if (cached) {
      const beneficiaries = JSON.parse(cached);
      console.log(
        '[AsyncCache] Retrieved cached beneficiaries:',
        beneficiaries.length,
      );
      return beneficiaries;
    }

    // If no cache exists, return empty array instead of null for offline mode
    console.log(
      '[AsyncCache] No cached beneficiaries found, returning empty array',
    );
    return [];
  } catch (error) {
    console.error('[AsyncCache] Error getting cached beneficiaries:', error);
    return [];
  }
};

// Cache current beneficiary
export const cacheCurrentBeneficiary = async beneficiary => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.CURRENT_BENEFICIARY,
      JSON.stringify(beneficiary),
    );
    console.log('[AsyncCache] Current beneficiary cached');
  } catch (error) {
    console.error('[AsyncCache] Error caching current beneficiary:', error);
  }
};

// Get cached current beneficiary
export const getCachedCurrentBeneficiary = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.CURRENT_BENEFICIARY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(
      '[AsyncCache] Error getting cached current beneficiary:',
      error,
    );
    return null;
  }
};

// Cache interventions
export const cacheInterventions = async interventions => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.INTERVENTIONS,
      JSON.stringify(interventions),
    );
    await setCacheTimestamp(CACHE_KEYS.INTERVENTIONS);
    console.log('[AsyncCache] Interventions cached successfully');
  } catch (error) {
    console.error('[AsyncCache] Error caching interventions:', error);
  }
};

// Get cached interventions
export const getCachedInterventions = async () => {
  try {
    const isExpired = await isCacheExpired(CACHE_KEYS.INTERVENTIONS);
    if (isExpired) {
      console.log('[AsyncCache] Interventions cache expired');
      return null;
    }

    const cached = await AsyncStorage.getItem(CACHE_KEYS.INTERVENTIONS);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[AsyncCache] Error getting cached interventions:', error);
    return null;
  }
};

// Cache screenings
export const cacheScreenings = async screenings => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.SCREENINGS,
      JSON.stringify(screenings),
    );
    await setCacheTimestamp(CACHE_KEYS.SCREENINGS);
    console.log('[AsyncCache] Screenings cached successfully');
  } catch (error) {
    console.error('[AsyncCache] Error caching screenings:', error);
  }
};

// Get cached screenings
export const getCachedScreenings = async () => {
  try {
    const isExpired = await isCacheExpired(CACHE_KEYS.SCREENINGS);
    if (isExpired) {
      console.log('[AsyncCache] Screenings cache expired');
      return null;
    }

    const cached = await AsyncStorage.getItem(CACHE_KEYS.SCREENINGS);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[AsyncCache] Error getting cached screenings:', error);
    return null;
  }
};

// Add operation to offline queue
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
    console.log('[AsyncCache] Added to offline queue:', newOperation);
  } catch (error) {
    console.error('[AsyncCache] Error adding to offline queue:', error);
  }
};

// Get offline queue
export const getOfflineQueue = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('[AsyncCache] Error getting offline queue:', error);
    return [];
  }
};

// Remove operation from offline queue
export const removeFromOfflineQueue = async operationId => {
  try {
    const queue = await getOfflineQueue();
    const filteredQueue = queue.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(
      CACHE_KEYS.OFFLINE_QUEUE,
      JSON.stringify(filteredQueue),
    );
    console.log('[AsyncCache] Removed from offline queue:', operationId);
  } catch (error) {
    console.error('[AsyncCache] Error removing from offline queue:', error);
  }
};

// Clear offline queue
export const clearOfflineQueue = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
    console.log('[AsyncCache] Offline queue cleared');
  } catch (error) {
    console.error('[AsyncCache] Error clearing offline queue:', error);
  }
};

// Check network connectivity
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    console.error('[AsyncCache] Error checking network:', error);
    return false;
  }
};

// Network state listener
export const addNetworkListener = callback => {
  return NetInfo.addEventListener(callback);
};

// Trigger sync when network becomes available
let syncTriggerTimeout = null;
export const triggerSyncWhenOnline = async syncFunction => {
  // Clear any existing timeout
  if (syncTriggerTimeout) {
    clearTimeout(syncTriggerTimeout);
  }

  // Set a new timeout to check network and sync
  syncTriggerTimeout = setTimeout(async () => {
    try {
      const online = await isOnline();
      if (online) {
        console.log('[AsyncCache] Network available - triggering sync');
        try {
          await syncFunction();
        } catch (syncError) {
          console.error('[AsyncCache] Sync function failed:', syncError);
        }
      } else {
        console.log(
          '[AsyncCache] Still offline - sync will be triggered when network becomes available',
        );
      }
    } catch (error) {
      console.error('[AsyncCache] Sync trigger failed:', error);
    }
  }, 2000); // Wait 2 seconds before checking
};

// Clear all cache
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
    console.log('[AsyncCache] All cache cleared');
  } catch (error) {
    console.error('[AsyncCache] Error clearing cache:', error);
  }
};

// Cache auth state
export const cacheAuthState = async authState => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.AUTH_STATE,
      JSON.stringify(authState),
    );
    console.log('[AsyncCache] Auth state cached');
  } catch (error) {
    console.error('[AsyncCache] Error caching auth state:', error);
  }
};

// Get cached auth state
export const getCachedAuthState = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.AUTH_STATE);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[AsyncCache] Error getting cached auth state:', error);
    return null;
  }
};

// Get cache size info
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
    console.error('[AsyncCache] Error getting cache info:', error);
    return {totalKeys: 0, cacheKeys: []};
  }
};

// Debug function to check cache status
export const debugCacheStatus = async () => {
  try {
    const beneficiaries = await getCachedBeneficiaries();
    const queue = await getOfflineQueue();
    const isConnected = await isOnline();

    console.log('[AsyncCache Debug] Cache Status:', {
      beneficiariesCount: beneficiaries.length,
      offlineQueueCount: queue.length,
      isOnline: isConnected,
      beneficiariesSample: beneficiaries.slice(0, 2),
      queueSample: queue.slice(0, 2),
    });

    return {
      beneficiariesCount: beneficiaries.length,
      offlineQueueCount: queue.length,
      isOnline: isConnected,
    };
  } catch (error) {
    console.error('[AsyncCache Debug] Error:', error);
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
