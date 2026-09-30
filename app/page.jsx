'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import TestForm from './components/TestForm';
import Results from './components/Results';
import History from './components/History';

export default function Home() {
  const [job, setJob] = useState(null);
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [formError, setFormError] = useState('');
  const timer = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history', { cache: 'no-store' });
      setHistory((await res.json()).batches || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => clearTimeout(timer.current);
  }, [loadHistory]);

  const openBatch = useCallback(async (id) => {
    const res = await fetch(`/api/batch/${id}`, { cache: 'no-store' });
    if (res.ok) setBatch(await res.json());
  }, []);

  const poll = useCallback(async (jobId) => {
    try {
      const res = await fetch(`/api/test/${jobId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setJob(null); setFormError(data.error); return; }
      setJob({ id: jobId, ...data });
      if (data.status === 'done') { await openBatch(data.batchId); loadHistory(); return; }
      if (data.status === 'error') { loadHistory(); return; }
    } catch { setFormError('Lost connection to the server.'); return; }
    timer.current = setTimeout(() => poll(jobId), 2000);
  }, [openBatch, loadHistory]);

  const start = async (params) => {
    setFormError(''); setBatch(null); setJob(null);
    const res = await fetch('/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error); return; }
    setJob({ id: data.jobId, status: 'queued', progress: { done: 0, total: 1, label: 'Waiting in queue' }, errors: [] });
    poll(data.jobId);
  };

  const running = job && (job.status === 'queued' || job.status === 'running');
  const pct = job ? Math.round((job.progress.done / Math.max(job.progress.total, 1)) * 100) : 0;

  return (
    <main className="shell">
      <header className="top">
        <h1>Casino Performance Check</h1>
        <p>Runs Lighthouse on a casino page, compares it with your previous test and exports a PDF.</p>
      </header>

      <TestForm disabled={running} onSubmit={start} />

      {formError && <div className="error" role="alert">{formError}</div>}

      {running && (
        <div className="progress" role="status" aria-live="polite">
          <strong>{job.progress.label}</strong>
          <div className="bar"><span style={{ width: `${Math.max(pct, 4)}%` }} /></div>
          <div className="hint" style={{ color: 'var(--muted)', marginTop: 6 }}>Lighthouse takes 30–90 seconds per run. Tests run one at a time so results stay accurate.</div>
        </div>
      )}

      {job && job.errors?.length > 0 && !running && (
        <div className="error" role="alert">
          {job.status === 'error' ? 'The test could not be completed.' : 'Some devices could not be tested.'}
          <ul>{job.errors.map((e, i) => <li key={i}><strong>{e.device}:</strong> {e.message}</li>)}</ul>
        </div>
      )}

      <div className="main">
        {batch ? (
          <Results key={batch.batchId} batch={batch} />
        ) : (
          <section className="panel empty">
            <h2>No results yet</h2>
            <p>Enter a page URL, pick its type and choose Run test. The results, the five slowest API calls and the heaviest images and scripts will appear here, along with the change since your last test.</p>
          </section>
        )}
        <History batches={history} activeId={batch?.batchId} onOpen={openBatch} />
      </div>
    </main>
  );
}
