import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;
const SAVE_FAILED = 'The results could not be saved in this browser (storage is full or blocked). Clear the history and run the test again.';
const CONNECTION_LOST = 'Lost connection to the server.';
const INITIAL_PROGRESS = { done: 0, total: 1, label: 'Waiting in queue' };

const isRunning = (job) => job?.status === 'queued' || job?.status === 'running';

/**
 * Inicia una prueba en el servidor, sondea su estado hasta que termina y permite cancelarla.
 * `onStart` se llama al lanzar una prueba; `onDone` recibe el lote terminado y devuelve false si no se pudo guardar.
 */
export function useTestJob({ onStart, onDone }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const timer = useRef(null);
  const activeJobId = useRef(null); // evita que un sondeo en curso reviva una prueba cancelada

  useEffect(() => () => clearTimeout(timer.current), []);

  const poll = useCallback(async (jobId) => {
    try {
      const response = await fetch(`/api/test/${jobId}`, { cache: 'no-store' });
      const data = await response.json();
      if (activeJobId.current !== jobId) return;
      if (!response.ok) { setJob(null); setError(data.error); return; }
      if (data.status === 'cancelled') { setJob(null); return; }
      setJob({ id: jobId, ...data });
      if (data.status === 'done') {
        const saved = onDone({ batchId: jobId, url: data.url, pageType: data.pageType, results: data.results });
        if (!saved) setError(SAVE_FAILED);
        return;
      }
      if (data.status === 'error') return;
    } catch {
      if (activeJobId.current === jobId) setError(CONNECTION_LOST);
      return;
    }
    timer.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS);
  }, [onDone]);

  const start = async (params) => {
    setError('');
    onStart();
    setJob(null);
    const response = await fetch('/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    const data = await response.json();
    if (!response.ok) { setError(data.error); return; }
    activeJobId.current = data.jobId;
    setJob({ id: data.jobId, status: 'queued', progress: INITIAL_PROGRESS, errors: [] });
    poll(data.jobId);
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/test/${job.id}`, { method: 'DELETE' });
      // 409: terminó justo antes de cancelar; el sondeo mostrará el resultado.
      if (response.ok || response.status === 404) {
        clearTimeout(timer.current);
        activeJobId.current = null;
        setJob(null);
      }
    } catch {
      setError(CONNECTION_LOST);
    }
    setCancelling(false);
  };

  return { job, running: isRunning(job), error, cancelling, start, cancel };
}
