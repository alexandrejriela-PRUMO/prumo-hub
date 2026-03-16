import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  getPendingRecords,
  updatePendingRecord,
  removePendingRecord,
  getPendingFiles,
  logSyncEvent,
  setLastSyncTime,
  getOfflineStats,
} from './OfflineStorageManager';

/**
 * Hook useOfflineSync
 * Gerencia sincronização automática de dados offline
 */
export const useOfflineSync = () => {
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncStats, setSyncStats] = useState({
    total_pending_records: 0,
    total_pending_files: 0,
    pending_creates: 0,
    pending_updates: 0,
    pending_deletes: 0,
  });
  const [lastError, setLastError] = useState(null);
  const syncTimeoutRef = useRef(null);
  const isOnlineRef = useRef(navigator.onLine);

  const syncRecord = useCallback(async (record) => {
    try {
      const { entity_name, operation, data, id } = record;

      let result;
      if (operation === 'create') {
        result = await base44.entities[entity_name].create(data);
        await removePendingRecord(id);
        await logSyncEvent(entity_name, id, operation, 'success');
        return { success: true, result };
      } else if (operation === 'update') {
        result = await base44.entities[entity_name].update(data.id, data);
        await removePendingRecord(id);
        await logSyncEvent(entity_name, id, operation, 'success');
        return { success: true, result };
      } else if (operation === 'delete') {
        await base44.entities[entity_name].delete(data.id);
        await removePendingRecord(id);
        await logSyncEvent(entity_name, id, operation, 'success');
        return { success: true };
      }
    } catch (error) {
      const errorMsg = error.message || 'Erro desconhecido';
      await updatePendingRecord(record.id, {
        status: 'error',
        error: errorMsg,
        retry_count: (record.retry_count || 0) + 1,
      });
      await logSyncEvent(record.entity_name, record.id, record.operation, 'error', errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  const syncFiles = useCallback(async () => {
    const files = await getPendingFiles();
    if (files.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const fileRecord of files) {
      try {
        const blob = new Blob([fileRecord.data], { type: fileRecord.type });
        const uploadedUrl = await base44.integrations.Core.UploadFile({ file: blob });

        await updatePendingRecord(fileRecord.id, {
          status: 'synced',
          uploaded_url: uploadedUrl.file_url,
          uploaded_at: new Date().toISOString(),
        });
        synced++;
      } catch (error) {
        console.error('[Sync] Erro ao sincronizar arquivo:', error);
        failed++;
      }
    }

    return { synced, failed };
  }, []);

  const performSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('[Sync] Offline - aguardando conexão');
      return { success: false, reason: 'offline' };
    }

    setSyncInProgress(true);
    setLastError(null);

    try {
      const records = await getPendingRecords();

      if (records.length === 0) {
        console.log('[Sync] Nenhum registro para sincronizar');
        await setLastSyncTime();
        setSyncInProgress(false);
        return { success: true, synced: 0 };
      }

      console.log(`[Sync] Sincronizando ${records.length} registros...`);

      const creates = records.filter(r => r.operation === 'create');
      const updates = records.filter(r => r.operation === 'update');
      const deletes = records.filter(r => r.operation === 'delete');

      const allOrdered = [...creates, ...updates, ...deletes];

      let synced = 0;
      let failed = 0;

      for (const record of allOrdered) {
        const result = await syncRecord(record);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }

      const fileResults = await syncFiles();
      await setLastSyncTime();

      const stats = await getOfflineStats();
      setSyncStats(stats);

      setSyncInProgress(false);
      return { success: true, synced, failed };
    } catch (error) {
      const errorMsg = error.message || 'Erro ao sincronizar';
      console.error('[Sync] Erro:', errorMsg);
      setLastError(errorMsg);
      setSyncInProgress(false);
      return { success: false, error: errorMsg };
    }
  }, [syncRecord, syncFiles]);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('[Sync] Conexão restaurada');
      isOnlineRef.current = true;
      
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        performSync();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('[Sync] Offline');
      isOnlineRef.current = false;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [performSync]);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await getOfflineStats();
      setSyncStats(stats);
    };
    loadStats();
  }, []);

  return {
    syncInProgress,
    syncStats,
    lastError,
    isOnline: isOnlineRef.current,
    performSync,
  };
};