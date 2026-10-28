import { db } from '../db/offlineDb.js';

let isSyncing = false;
let retryAttempt = 0;
let syncListeners = [];

export function subscribeSyncStatus(listener) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifySyncListeners(state) {
  syncListeners.forEach(listener => listener(state));
}

/**
 * Trigger Batch Synchronization with Server
 */
export async function triggerSync() {
  if (isSyncing || !navigator.onLine) {
    return { success: false, reason: isSyncing ? 'Already syncing' : 'Offline' };
  }

  try {
    isSyncing = true;
    notifySyncListeners({ isSyncing: true });

    const queueItems = await db.syncQueue.where('syncStatus').equals('pending').toArray();

    if (queueItems.length === 0) {
      isSyncing = false;
      notifySyncListeners({ isSyncing: false, pendingCount: 0, lastSyncedAt: new Date() });
      return { success: true, processed: 0 };
    }

    const payload = {
      deviceId: localStorage.getItem('healthverse_device_id') || 'web-pwa-client',
      records: queueItems.map(item => ({
        collection: item.collection,
        clientUuid: item.clientUuid,
        data: item.data,
        updatedAt: item.data?.updatedAt || item.createdAt
      }))
    };

    const response = await fetch('/api/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Sync server responded with ${response.status}`);
    }

    const result = await response.json();

    // Mark synced records in local IndexedDB
    for (const res of result.results || []) {
      if (res.status === 'created' || res.status === 'merged' || res.status === 'conflict') {
        // Remove from queue
        await db.syncQueue.where('clientUuid').equals(res.clientUuid).delete();

        // Update corresponding store syncStatus to 'synced'
        if (res.collection === 'adherence') {
          await db.adherenceLogs.where('clientUuid').equals(res.clientUuid).modify({ syncStatus: 'synced' });
        } else if (res.collection === 'symptoms') {
          await db.symptomReports.where('clientUuid').equals(res.clientUuid).modify({ syncStatus: 'synced' });
        } else if (res.collection === 'patients') {
          await db.patients.where('clientUuid').equals(res.clientUuid).modify({ syncStatus: 'synced' });
        }
      }
    }

    retryAttempt = 0;
    isSyncing = false;
    const remainingCount = await db.syncQueue.where('syncStatus').equals('pending').count();

    notifySyncListeners({
      isSyncing: false,
      pendingCount: remainingCount,
      lastSyncedAt: new Date(),
      lastResult: result.summary
    });

    return { success: true, summary: result.summary };
  } catch (err) {
    console.error('Batch synchronization error:', err.message);
    isSyncing = false;

    // Exponential backoff retry
    retryAttempt++;
    const backoffMs = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
    setTimeout(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    }, backoffMs);

    const pendingCount = await db.syncQueue.where('syncStatus').equals('pending').count();
    notifySyncListeners({ isSyncing: false, error: err.message, pendingCount });
    return { success: false, error: err.message };
  }
}

/**
 * Initialize network listeners for automatic sync
 */
export function initAutoSync() {
  window.addEventListener('online', () => {
    console.log('[HealthVerse] Connectivity restored. Initiating auto-sync...');
    triggerSync();
  });

  window.addEventListener('offline', () => {
    console.log('[HealthVerse] Network went offline. Switching to local IndexedDB.');
    notifySyncListeners({ isOnline: false });
  });

  // Periodic background check if online
  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      triggerSync();
    }
  }, 60000); // Check every minute
}
