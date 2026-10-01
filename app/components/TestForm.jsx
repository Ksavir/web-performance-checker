'use client';
import { useEffect, useState } from 'react';
import { PAGE_TYPES } from '@/lib/config';

const STORAGE_KEY = 'casino-perf:urls';

export default function TestForm({ disabled, onSubmit }) {
  const [pageType, setPageType] = useState('homepage');
  const [urls, setUrls] = useState({});
  const [devices, setDevices] = useState({ mobile: true, desktop: true });
  const [runs, setRuns] = useState('1');

  // Recuerda la última URL usada para cada tipo de página.
  useEffect(() => {
    try { setUrls(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { /* ignore */ }
  }, []);
  const setUrl = (v) => {
    const next = { ...urls, [pageType]: v };
    setUrls(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      url: urls[pageType] || '',
      pageType,
      devices: Object.keys(devices).filter((d) => devices[d]),
      runs: Number(runs),
    });
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>New test</h2>
      <div className="field">
        <label htmlFor="url">Page URL</label>
        <input id="url" className="url-input" type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://www.example-casino.com/" value={urls[pageType] || ''} onChange={(e) => setUrl(e.target.value)} />
      </div>

      <fieldset className="field">
        <legend>Page type</legend>
        <div className="seg seg-grid">
          {PAGE_TYPES.map((p) => (
            <span key={p.id} style={{ display: 'contents' }}>
              <input type="radio" name="pageType" id={`pt-${p.id}`} checked={pageType === p.id} onChange={() => setPageType(p.id)} />
              <label htmlFor={`pt-${p.id}`}>{p.label}</label>
            </span>
          ))}
        </div>
        <p className="hint">Each page type remembers its own URL.</p>
      </fieldset>

      <fieldset className="field">
        <legend>Test on</legend>
        <div className="seg seg-grid">
          {['mobile', 'desktop'].map((d) => (
            <span key={d} style={{ display: 'contents' }}>
              <input type="checkbox" id={`dev-${d}`} checked={devices[d]} onChange={(e) => setDevices({ ...devices, [d]: e.target.checked })} />
              <label htmlFor={`dev-${d}`}>{d === 'mobile' ? 'Mobile' : 'Desktop'}</label>
            </span>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="runs">Accuracy</label>
        <select id="runs" className="select" value={runs} onChange={(e) => setRuns(e.target.value)}>
          <option value="1">1 run per device (about 1 min)</option>
          <option value="3">3 runs, median (more stable)</option>
        </select>
      </div>

      <button className="run-btn" type="submit" disabled={disabled}>{disabled ? 'Running…' : 'Run test'}</button>
      <p className="hint">Only test sites you own or have permission to test.</p>
    </form>
  );
}
