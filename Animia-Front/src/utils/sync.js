// src/utils/sync.js
import NetInfo from '@react-native-community/netinfo';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  addToOfflineQueue,
} from './asyncCache';
import {Alert} from 'react-native';

// Use existing EC2 backend for sync
const SYNC_ENDPOINT = 'http://3.80.46.128:3000/api/sync';

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({ok: true}));
}

export async function runSyncOnce() {
  if (!SYNC_ENDPOINT) return false; // not configured yet; keep items queued

  const state = await NetInfo.fetch();
  if (!state.isConnected) return false;

  const items = await getOfflineQueue();
  if (!items || !items.length) return true;

  console.log('[Sync] Processing offline queue:', items.length, 'items');
  let syncedCount = 0;

  for (const item of items) {
    try {
      const payload = item.payload || {};
      await postJSON(SYNC_ENDPOINT, {
        op: item.operation,
        entity: item.entity,
        payload,
        timestamp: item.timestamp,
      });
      await removeFromOfflineQueue(item.id);
      syncedCount++;
      console.log('[Sync] Successfully synced item:', item.id);
    } catch (e) {
      console.error(
        '[Sync] Failed to sync item:',
        item.id,
        e?.message || String(e),
      );
      // Keep item in queue for retry
    }
  }

  // Show success notification if items were synced
  if (syncedCount > 0) {
    Alert.alert(
      'Sync Complete',
      `${syncedCount} offline item(s) synced successfully. Notifications and SMS have been sent.`,
      [{text: 'OK'}],
    );
  }

  return true;
}

let loopHandle = null;
export function startSyncLoop(intervalMs = 60_000) {
  if (loopHandle) return;
  const tick = async () => {
    try {
      await runSyncOnce();
    } catch (_) {}
  };
  loopHandle = setInterval(tick, intervalMs);
  tick();
}

export function stopSyncLoop() {
  if (loopHandle) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
}
