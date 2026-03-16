/**
 * Offline Storage Manager
 * Gerencia armazenamento de dados offline usando IndexedDB
 */

const DB_NAME = 'PRUMO_OFFLINE_DB';
const DB_VERSION = 1;
const STORES = {
  PENDING_RECORDS: 'pendingRecords',
  SYNC_QUEUE: 'syncQueue',
  LOCAL_CACHE: 'localCache',
  FILE_UPLOADS: 'fileUploads',
  SYNC_LOG: 'syncLog',
};

let db = null;

export const initializeOfflineDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[Offline] IndexedDB inicializado');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.PENDING_RECORDS)) {
        const store = db.createObjectStore(STORES.PENDING_RECORDS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('entity_name', 'entity_name', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('entity_name', 'entity_name', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.LOCAL_CACHE)) {
        db.createObjectStore(STORES.LOCAL_CACHE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.FILE_UPLOADS)) {
        const store = db.createObjectStore(STORES.FILE_UPLOADS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
        db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const addPendingRecord = async (entityName, operation, data, metadata = {}) => {
  if (!db) await initializeOfflineDB();

  const record = {
    entity_name: entityName,
    operation,
    data,
    metadata: { ...metadata, userEmail: metadata.userEmail || 'unknown' },
    status: 'pending',
    created_at: new Date().toISOString(),
    synced_at: null,
    error: null,
    retry_count: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readwrite');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const request = store.add(record);

    request.onsuccess = () => {
      console.log(`[Offline] Registro pendente criado:`, record.entity_name, operation);
      resolve({ ...record, id: request.result });
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPendingRecords = async (entityName = null, status = 'pending') => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readonly');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const index = store.index('status');
    const range = IDBKeyRange.only(status);
    const request = index.getAll(range);

    request.onsuccess = () => {
      let records = request.result;
      if (entityName) {
        records = records.filter(r => r.entity_name === entityName);
      }
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
};

export const updatePendingRecord = async (id, updates) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readwrite');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error('Registro não encontrado'));
        return;
      }

      const updated = { ...record, ...updates, updated_at: new Date().toISOString() };
      const updateRequest = store.put(updated);

      updateRequest.onsuccess = () => {
        console.log(`[Offline] Registro ${id} atualizado`);
        resolve(updated);
      };
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const removePendingRecord = async (id) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readwrite');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`[Offline] Registro ${id} removido`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveFileForOfflineUpload = async (file, metadata = {}) => {
  if (!db) await initializeOfflineDB();

  const arrayBuffer = await file.arrayBuffer();

  const fileRecord = {
    name: file.name,
    type: file.type,
    size: file.size,
    data: arrayBuffer,
    metadata,
    status: 'pending',
    created_at: new Date().toISOString(),
    uploaded_at: null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.FILE_UPLOADS], 'readwrite');
    const store = tx.objectStore(STORES.FILE_UPLOADS);
    const request = store.add(fileRecord);

    request.onsuccess = () => {
      console.log(`[Offline] Arquivo salvo:`, file.name);
      resolve({ ...fileRecord, id: request.result });
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPendingFiles = async () => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.FILE_UPLOADS], 'readonly');
    const store = tx.objectStore(STORES.FILE_UPLOADS);
    const index = store.index('status');
    const request = index.getAll(IDBKeyRange.only('pending'));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const setCacheData = async (key, data) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.LOCAL_CACHE], 'readwrite');
    const store = tx.objectStore(STORES.LOCAL_CACHE);
    const request = store.put({
      key,
      data,
      cached_at: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCacheData = async (key) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.LOCAL_CACHE], 'readonly');
    const store = tx.objectStore(STORES.LOCAL_CACHE);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const cleanupOldOfflineData = async () => {
  if (!db) await initializeOfflineDB();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readwrite');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const index = store.index('created_at');
    const range = IDBKeyRange.upperBound(thirtyDaysAgo);
    const request = index.openCursor(range);

    let deleted = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleted++;
        cursor.continue();
      } else {
        console.log(`[Offline] ${deleted} registros antigos removidos`);
        resolve(deleted);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const logSyncEvent = async (entityName, recordId, operation, status, error = null) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_LOG], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_LOG);
    const request = store.add({
      entity_name: entityName,
      record_id: recordId,
      operation,
      status,
      error,
      timestamp: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineStats = async () => {
  if (!db) await initializeOfflineDB();

  const pending = await getPendingRecords();
  const files = await getPendingFiles();

  const stats = {
    total_pending_records: pending.length,
    pending_creates: pending.filter(r => r.operation === 'create').length,
    pending_updates: pending.filter(r => r.operation === 'update').length,
    pending_deletes: pending.filter(r => r.operation === 'delete').length,
    total_pending_files: files.length,
    total_file_size: files.reduce((sum, f) => sum + f.size, 0),
    last_sync: await getLastSyncTime(),
  };

  return stats;
};

export const getLastSyncTime = async () => {
  const cached = await getCacheData('last_sync_time');
  return cached || null;
};

export const setLastSyncTime = async () => {
  await setCacheData('last_sync_time', new Date().toISOString());
};

export const getRecordSyncStatus = async (recordId) => {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PENDING_RECORDS], 'readonly');
    const store = tx.objectStore(STORES.PENDING_RECORDS);
    const request = store.get(recordId);

    request.onsuccess = () => {
      const record = request.result;
      if (record) {
        resolve({
          status: record.status,
          error: record.error,
          retry_count: record.retry_count,
        });
      } else {
        resolve({ status: 'synced' });
      }
    };
    request.onerror = () => reject(request.error);
  });
};