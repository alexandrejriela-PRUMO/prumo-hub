import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { addPendingRecord, saveFileForOfflineUpload } from './OfflineStorageManager';

/**
 * Hook useOfflineForm
 * Integra forms com suporte offline
 */
export const useOfflineForm = (entityName) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveRecord = useCallback(async (data, files = [], isUpdate = false) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      if (isOnline) {
        let result;
        if (isUpdate && data.id) {
          result = await base44.entities[entityName].update(data.id, data);
        } else {
          result = await base44.entities[entityName].create(data);
        }

        for (const file of files) {
          try {
            const uploaded = await base44.integrations.Core.UploadFile({ file });
            console.log('[Form] Arquivo enviado');
          } catch (err) {
            console.error('[Form] Erro ao enviar arquivo:', err);
          }
        }

        setIsSaving(false);
        return { success: true, result, offline: false };
      } else {
        const recordData = { ...data };
        const operation = isUpdate && data.id ? 'update' : 'create';
        
        const pendingRecord = await addPendingRecord(
          entityName,
          operation,
          recordData,
          { timestamp: new Date().toISOString() }
        );

        const savedFiles = [];
        for (const file of files) {
          try {
            const savedFile = await saveFileForOfflineUpload(file, {
              entity_name: entityName,
              record_id: pendingRecord.id,
            });
            savedFiles.push(savedFile);
          } catch (err) {
            console.error('[Form] Erro ao salvar arquivo:', err);
          }
        }

        setIsSaving(false);
        return {
          success: true,
          result: { ...pendingRecord, files: savedFiles },
          offline: true,
          message: `Registro salvo. Será sincronizado quando conectado.`,
        };
      }
    } catch (error) {
      const errorMsg = error.message || 'Erro ao salvar';
      setSaveError(errorMsg);
      setIsSaving(false);
      return { success: false, error: errorMsg, offline: isOnline };
    }
  }, [entityName, isOnline]);

  return {
    isOnline,
    isSaving,
    saveError,
    saveRecord,
  };
};