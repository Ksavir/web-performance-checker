'use client';
import { useEffect, useState } from 'react';
import { PAGE_TYPES } from '@/lib/config';

const icon = (children) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const DEVICES = [
  { id: 'mobile', label: 'Mobile', note: 'Phone, Tablet', icon: icon(<><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>) },
  { id: 'desktop', label: 'Desktop', note: 'Computer, Laptop', icon: icon(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>) },
];

const STORAGE_KEY = 'casino-perf:urls';

export default function TestForm({ disabled, onSubmit }) {
  const [pageType, setPageType] = useState('homepage');
  const [urls, setUrls] = useState({});
  const [devices, setDevices] = useState({ mobile: false, desktop: true });
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

  const selected = DEVICES.filter((d) => devices[d.id]);
  const noDevice = selected.length === 0;

  const submit = (e) => {
    e.preventDefault();
    if (noDevice) return;
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

      {/* <fieldset className="field">
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
      </fieldset> */}

      <fieldset className="field">
        <legend>Test on</legend>
        <div className="devices">
          {DEVICES.map((d) => (
            <span key={d.id} style={{ display: 'contents' }}>
              <input type="checkbox" id={`dev-${d.id}`} checked={devices[d.id]} onChange={(e) => setDevices({ ...devices, [d.id]: e.target.checked })} />
              <label htmlFor={`dev-${d.id}`} className="device">
                <span className="device-icon">{d.icon}</span>
                <span className="device-text"><strong>{d.label}</strong><small>{d.note}</small></span>
                <span className="device-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </label>
            </span>
          ))}
        </div>
        {/* <p className={`hint ${noDevice ? 'hint-warn' : ''}`} aria-live="polite">
          {noDevice ? 'Select at least one device to run the test.' : `Selected: ${selected.map((d) => d.label).join(' and ')}.`}
        </p> */}
      </fieldset>

      <div className="field">
        <label htmlFor="runs">Accuracy</label>
        <select id="runs" className="select" value={runs} onChange={(e) => setRuns(e.target.value)}>
          <option value="1">1 run per device (about 1 min)</option>
          <option value="3">3 runs, median (more stable)</option>
        </select>
      </div>

      <button className="run-btn" type="submit" disabled={disabled || noDevice}>{disabled ? 'Running…' : 'Run test'}</button>
      <p className="hint">Only test sites you own or have permission to test.</p>
    </form>
  );
}
