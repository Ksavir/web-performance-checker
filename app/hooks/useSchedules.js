import { useCallback, useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 15_000;

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

const jsonBody = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Pruebas programadas guardadas en el servidor. Se refrescan solas para que aparezcan los resultados nuevos. */
export function useSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setSchedules((await request('/api/schedules')).schedules);
      setError('');
    } catch { setError('Scheduled tests could not be loaded.'); }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  /** Ejecuta una acción y refresca la lista. Devuelve el mensaje de error, o '' si salió bien. */
  const act = useCallback(async (url, options) => {
    try {
      const data = await request(url, options);
      await refresh();
      return { data, error: '' };
    } catch (e) { return { data: null, error: e.message }; }
  }, [refresh]);

  const create = useCallback((body) => act('/api/schedules', jsonBody('POST', body)), [act]);
  const setEnabled = useCallback((id, enabled) => act(`/api/schedules/${id}`, jsonBody('PATCH', { enabled })), [act]);
  const remove = useCallback((id) => act(`/api/schedules/${id}`, { method: 'DELETE' }), [act]);
  const runNow = useCallback((id) => act(`/api/schedules/${id}/run`, { method: 'POST' }), [act]);
  const loadRuns = useCallback(async (id) => (await request(`/api/schedules/${id}/runs`)).runs, []);

  return { schedules, error, create, setEnabled, remove, runNow, loadRuns };
}
