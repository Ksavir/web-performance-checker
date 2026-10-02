'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import TestForm from './components/TestForm';
import Results from './components/Results';
import History from './components/History';
import { clearAll, deleteBatch, getBatch, listBatches, saveBatch } from '@/lib/storage';

export default function Home() {
  const [job, setJob] = useState(null);
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [formError, setFormError] = useState('');
  const timer = useRef(null);

  const loadHistory = useCallback(() => setHistory(listBatches()), []);

  useEffect(() => {
    loadHistory();
    return () => clearTimeout(timer.current);
  }, [loadHistory]);

  const openBatch = useCallback((id) => {
    const results = getBatch(id);
    if (results.length) setBatch({ batchId: id, results });
  }, []);

  const removeBatch = (id) => {
    deleteBatch(id);
    if (batch?.batchId === id) setBatch(null);
    loadHistory();
  };

  const clearHistory = () => { clearAll(); setBatch(null); loadHistory(); };

  const poll = useCallback(async (jobId) => {
    try {
      const res = await fetch(`/api/test/${jobId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setJob(null); setFormError(data.error); return; }
      setJob({ id: jobId, ...data });
      if (data.status === 'done') {
        if (!saveBatch(jobId, data.url, data.pageType, data.results)) {
          setFormError('The results could not be saved in this browser (storage is full or blocked). Clear the history and run the test again.');
          return;
        }
        loadHistory();
        openBatch(jobId);
        return;
      }
      if (data.status === 'error') return;
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
    <div className="shell">
      <header className="topbar">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <h1>Casino Performance Check</h1>
          <p>Test a URL page, compare it with your last test and export a PDF.</p>
        </div>
      </header>

      <div className="workspace">
        <div className="side">
          <TestForm disabled={running} onSubmit={start} />
          <History batches={history} activeId={batch?.batchId} onOpen={openBatch} onClear={clearHistory} onDelete={removeBatch} />
        </div>

        <main className="content">
          {formError && <div className="error" role="alert">{formError}</div>}

          {running && (
            <div className="progress" role="status" aria-live="polite">
              <div className="progress-head"><strong>{job.progress.label}</strong><span>{pct}%</span></div>
              <div className="bar"><span style={{ width: `${Math.max(pct, 4)}%` }} /></div>
              <div className="hint"> Takes 30–90 seconds per run </div>
            </div>
          )}

          {job && job.errors?.length > 0 && !running && (
            <div className="error" role="alert">
              {job.status === 'error' ? 'The test could not be completed.' : 'Some devices could not be tested.'}
              <ul>{job.errors.map((e, i) => <li key={i}><strong>{e.device}:</strong> {e.message}</li>)}</ul>
            </div>
          )}

          {batch ? (
            <Results key={batch.batchId} batch={batch} />
          ) : (
            !running && (
              <section className="panel empty">
                <div className="empty-ring" aria-hidden="true" />
                <h2>Run your first test</h2>
                <p>Paste a page URL, choose its type and select Run test. Scores, the slowest API calls and the heaviest images and scripts will show up here.</p>
              </section>
            )
          )}
        </main>
      </div>
    </div>
  );
}
