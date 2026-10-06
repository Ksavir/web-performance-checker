import { useCallback, useEffect, useState } from 'react';
import { clearBatches, deleteBatch, getBatch, listBatches, saveBatch } from '@/lib/storage';

/** Historial guardado en el navegador y el lote abierto en el panel de resultados. */
export function useHistory() {
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);

  const refresh = useCallback(() => setBatches(listBatches()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const openBatch = useCallback((batchId) => {
    const results = getBatch(batchId);
    if (results.length) setActiveBatch({ batchId, results });
  }, []);

  const closeBatch = useCallback(() => setActiveBatch(null), []);

  /** Guarda el resultado de una prueba y lo abre. Devuelve false si el navegador no permite guardar. */
  const saveResults = useCallback((batch) => {
    if (!saveBatch(batch)) return false;
    refresh();
    openBatch(batch.batchId);
    return true;
  }, [refresh, openBatch]);

  const removeBatch = useCallback((batchId) => {
    deleteBatch(batchId);
    setActiveBatch((current) => (current?.batchId === batchId ? null : current));
    refresh();
  }, [refresh]);

  const clearHistory = useCallback(() => {
    clearBatches();
    setActiveBatch(null);
    refresh();
  }, [refresh]);

  return { batches, activeBatch, openBatch, closeBatch, saveResults, removeBatch, clearHistory };
}
