// src/utils/sync.js
import NetInfo from '@react-native-community/netinfo';
import { getPendingOutbox, markOutboxSuccess, markOutboxError } from '../database/schema';

// If you don't have a backend yet, leave this as null. The sync loop will no-op.
const SYNC_ENDPOINT = null; // e.g., 'https://your-server/api/sync'

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(()=>({ ok: true }));
}

export async function runSyncOnce() {
  if (!SYNC_ENDPOINT) return false; // not configured yet; keep items queued

  const state = await NetInfo.fetch();
  if (!state.isConnected) return false;

  const items = await getPendingOutbox(50);
  if (!items || !items.length) return true;

  for (const it of items) {
    try {
      const payload = JSON.parse(it.payload || '{}');
      await postJSON(SYNC_ENDPOINT, { op: it.op, entity: it.entity, payload });
      await markOutboxSuccess(it.id);
    } catch (e) {
      await markOutboxError(it.id, e?.message || String(e));
    }
  }

  return true;
}

let loopHandle = null;
export function startSyncLoop(intervalMs = 60_000) {
  if (loopHandle) return;
  const tick = async () => {
    try { await runSyncOnce(); } catch (_) {}
  };
  loopHandle = setInterval(tick, intervalMs);
  tick();
}

export function stopSyncLoop() {
  if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }
}
