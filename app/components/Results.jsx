'use client';
import { useState } from 'react';
import { METRICS, PAGE_TYPES, formatValue, formatBytes, rate } from '@/lib/config';
import ScoreChip from './ScoreChip';

const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const shortUrl = (u) => { try { const x = new URL(u); return x.host + x.pathname + x.search; } catch { return u; } };

function Delta({ d, fmt, isScore }) {
  if (!d) return <span className="d-same">–</span>;
  if (d.status === 'same') return <span className="d-same">no change</span>;
  const sign = d.diff > 0 ? '+' : '−';
  const abs = Math.abs(d.diff);
  const text = isScore ? Math.round(abs) : formatValue(fmt, abs);
  return (
    <span className={d.status === 'better' ? 'd-better' : 'd-worse'}>
      {d.status === 'better' ? '▲' : '▼'} {sign}{text}
    </span>
  );
}

function CopyUrl({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <span className="url-wrap">
      <span title={url}>{shortUrl(url)}</span>
      <button type="button" className="copy-btn" onClick={copy} aria-label={copied ? 'URL copied' : 'Copy full URL'} title={copied ? 'Copied' : 'Copy full URL'}>
        {copied ? (
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>
        )}
      </button>
    </span>
  );
}

function Findings({ title, note, rows, columns, empty }) {
  // Orden por columna: los números empiezan de mayor a menor, el texto de A a Z.
  const [sort, setSort] = useState(null);
  const toggle = (c) => setSort((s) => (s?.h === c.h ? { h: c.h, dir: -s.dir } : { h: c.h, dir: c.num ? -1 : 1 }));
  const col = sort && columns.find((c) => c.h === sort.h);
  const sorted = col
    ? [...rows].sort((a, b) => {
      const x = col.sort(a), y = col.sort(b);
      return (typeof x === 'string' ? x.localeCompare(y) : (x ?? -1) - (y ?? -1)) * sort.dir;
    })
    : rows;
  return (
    <>
      <h3>{title}</h3>
      {note && <p className="note">{note}</p>}
      {rows.length === 0 ? (
        <div className="none">{empty}</div>
      ) : (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.h} className={c.num ? 'num' : ''} aria-sort={sort?.h === c.h ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}>
                    {c.sort && rows.length > 1 ? (
                      <button type="button" className="sort-btn" onClick={() => toggle(c)}>
                        {c.h}<span className="sort-ind" aria-hidden="true">{sort?.h === c.h ? (sort.dir > 0 ? '▲' : '▼') : '↕'}</span>
                      </button>
                    ) : c.h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.h} className={`${c.num ? 'num' : ''} ${c.url ? 'url-cell' : ''}`}>{c.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DeviceResult({ t }) {
  const cmp = t.comparison;
  const slowMax = Math.max(1, ...t.findings.slowApis.map((r) => r.duration));
  const sv = t.findings.savings || {};
  const savingsRows = [
    ['Unused JavaScript', sv.unusedJs], ['Unminified JavaScript', sv.unminifiedJs],
    ['Oversized images', sv.oversizedImages], ['Modern image formats', sv.modernImageFormats],
  ].filter(([, v]) => v != null);

  return (
    <div role="tabpanel">
      <div className="hero">
        <ScoreChip
          score={t.score}
          caption={cmp ? <>vs previous: <Delta d={cmp.deltas.score} isScore /></> : 'First test for this page'}
        />
        <div>
          <div className="tiles">
            {METRICS.map((m) => {
              const d = cmp?.deltas[m.key];
              const r = ['lcp', 'fcp', 'tbt', 'cls'].includes(m.key) ? rate(m.key, t[m.key]) : 'none';
              return (
                <div key={m.key} className={`tile r-${r}`}>
                  <div className="t-label" title={m.label}>{m.label}</div>
                  <div className="t-val">
                    {formatValue(m.fmt, t[m.key])}
                    {r !== 'none' && <span className="sr-only"> ({r === 'ok' ? 'needs improvement' : r})</span>}
                  </div>
                  <div className="t-foot">
                    <Delta d={d} fmt={m.fmt} />
                    {d && <span className="t-prev">was {formatValue(m.fmt, d.previous)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {cmp && <p className="note" style={{ margin: '10px 0 0' }}>Compared with the test from {fmtDate(cmp.previousDate)}.</p>}
        </div>
      </div>

      {t.warnings.length > 0 && (
        <div className="warn" role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{t.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <div className="section">
        <Findings
          title="Five slowest API requests"
          note="XHR/fetch calls and JSON responses, ordered by duration."
          empty="No API requests were detected on this page load."
          rows={t.findings.slowApis}
          columns={[
            { h: 'Request', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
            { h: 'Duration', num: true, sort: (r) => r.duration, cell: (r) => (<>{Math.round(r.duration)} ms<div className="mini" style={{ width: `${(r.duration / slowMax) * 100}%` }} /></>) },
            { h: 'Status', num: true, sort: (r) => r.status, cell: (r) => r.status ?? '–' },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
          ]}
        />
        <Findings
          title="Oversized images"
          note="Images above 200 KB transferred."
          empty="No images above the threshold."
          rows={t.findings.bigImages}
          columns={[
            { h: 'Image', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
          ]}
        />
        <Findings
          title="Oversized JavaScript files"
          note="Scripts above 150 KB transferred."
          empty="No scripts above the threshold."
          rows={t.findings.bigScripts}
          columns={[
            { h: 'Script', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
          ]}
        />
        {savingsRows.length > 0 && (
          <Findings
            title="Estimated savings from Lighthouse"
            empty=""
            rows={savingsRows}
            columns={[
              { h: 'Opportunity', sort: (r) => r[0], cell: (r) => r[0] },
              { h: 'Potential savings', num: true, sort: (r) => r[1], cell: (r) => formatBytes(r[1]) },
            ]}
          />
        )}
      </div>
    </div>
  );
}

export default function Results({ batch }) {
  const results = [...batch.results].sort((a) => (a.device === 'mobile' ? -1 : 1));
  const [active, setActive] = useState(results[0].device);
  const current = results.find((r) => r.device === active) || results[0];
  const first = results[0];
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const exportPdf = async () => {
    setBusy(true); setPdfError('');
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) });
      if (!res.ok) throw new Error();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob());
      a.download = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'report.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setPdfError('The PDF could not be created. Try again.'); }
    setBusy(false);
  };

  return (
    <section className="panel" aria-label="Test results">
      <div className="res-head">
        <div>
          <h2>{PAGE_TYPES.find((p) => p.id === first.pageType)?.label} · {fmtDate(first.createdAt)}</h2>
          <div className="sub">{first.url}{first.runs > 1 ? ` · median of ${first.runs} runs` : ''}</div>
        </div>
        <button type="button" className="pdf-btn" onClick={exportPdf} disabled={busy}>{busy ? 'Preparing PDF…' : 'Export PDF'}</button>
      </div>
      {pdfError && <div className="error" role="alert" style={{ margin: '0 24px 16px' }}>{pdfError}</div>}
      {results.length > 1 && (
        <div className="tabs" role="tablist">
          {results.map((r) => (
            <button key={r.device} role="tab" className="tab" aria-selected={active === r.device} onClick={() => setActive(r.device)}>
              {r.device === 'mobile' ? 'Mobile' : 'Desktop'} · {r.score}
            </button>
          ))}
        </div>
      )}
      <DeviceResult key={current.id} t={current} />
    </section>
  );
}
