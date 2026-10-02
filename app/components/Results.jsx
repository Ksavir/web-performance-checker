'use client';
import { useState } from 'react';
import { LCP_PHASES, METRICS, OPPORTUNITIES, PAGE_TYPES, formatValue, formatBytes, rate } from '@/lib/config';
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

function CopyButton({ text, what = 'URL' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={copied ? `${what} copied` : `Copy full ${what}`} title={copied ? 'Copied' : `Copy full ${what}`}>
        {copied ? (
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>
        )}
    </button>
  );
}

function CopyUrl({ url, hint, link = false }) {
  return (
    <>
      <span className="url-wrap">
        {link
          ? <a className="url-link" href={url} target="_blank" rel="noopener noreferrer" title={`${url} (opens in a new tab)`}>{shortUrl(url)}</a>
          : <span title={url}>{shortUrl(url)}</span>}
        <CopyButton text={url} />
      </span>
      {hint && <div className="row-hint">{hint}</div>}
    </>
  );
}

/** Miniatura de la imagen; abre el original en otra pestaña. Si el sitio no permite cargarla, muestra un ícono. */
function ImageThumb({ url }) {
  const [failed, setFailed] = useState(false);
  return (
    <a className="thumb" href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
      {failed ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 9" /></svg>
      ) : (
        <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
    </a>
  );
}

const ms = (v) => formatValue('ms', v);

function LcpBreakdown({ lcp }) {
  const total = lcp.phases.reduce((s, p) => s + p.duration, 0);
  const shown = lcp.phases.filter((p) => p.duration > 0);
  const top = shown.reduce((m, p) => (p.duration > (m?.duration ?? -1) ? p : m), null);
  const pct = (v) => Math.round((v / Math.max(total, 1)) * 100);
  return (
    <>
      <h3>What delays the Largest Contentful Paint</h3>
      <p className="note">
        {total > 0
          ? `Share of each phase in the real, unthrottled load (${ms(total)}). The LCP tile above is simulated on a throttled connection, so compare shares, not times. Fix the biggest share first.`
          : 'Lighthouse could not split the LCP into phases.'}
      </p>
      {total > 0 && (
        <>
          <ul className="phase-legend">
            {lcp.phases.map((p) => (
              <li key={p.id}>
                <span className="pl-label">{p.label}</span>
                <span className="pl-val">{pct(p.duration)}%</span>
                <span className="pl-label">{ms(p.duration)}</span>
              </li>
            ))}
          </ul>
          {top && LCP_PHASES[top.id] && (
            <div className="tip"><strong>Biggest share: {top.label} ({pct(top.duration)}%).</strong> {LCP_PHASES[top.id].tip}</div>
          )}
        </>
      )}
      {lcp.element && (
        <div className="lcp-el">
          <h4 className="mini-title">Where to find it</h4>
          <div className="lcp-el-head">
            <span>LCP element{lcp.element.label ? <>: <strong>{lcp.element.label}</strong></> : null}</span>
          </div>
          {lcp.element.selector && (
            <div className="url-wrap"><code>{lcp.element.selector}</code><CopyButton text={lcp.element.selector} what="selector" /></div>
          )}
          {lcp.element.snippet && <pre className="snippet">{lcp.element.snippet}</pre>}
        </div>
      )}
    </>
  );
}

function Opportunities({ items }) {
  return (
    <>
      <h3>Top opportunities</h3>
      <p className="note">Ordered by estimated time saved. Estimates come from Lighthouse; open one to see the files involved.</p>
      {items.length === 0 ? (
        <div className="none">Lighthouse found no significant opportunities.</div>
      ) : (
        <div className="opps">
          {items.map((o) => (
            <details key={o.id} className="opp">
              <summary>
                <span className="opp-title">{o.title}</span>
                <span className="opp-impact">
                  {o.savingsMs ? <span className="badge">−{ms(o.savingsMs)} {o.metric}</span> : null}
                  {o.savingsBytes ? <span className="badge badge-muted">{formatBytes(Math.round(o.savingsBytes))}</span> : null}
                </span>
              </summary>
              <p className="opp-tip">{OPPORTUNITIES[o.id]?.tip}</p>
              {o.items.length > 0 && (
                <div className="table-wrap">
                  <table className="ledger">
                    <tbody>
                      {o.items.map((r, i) => (
                        <tr key={i}>
                          <td className="url-cell">{/^https?:/.test(r.url) ? <CopyUrl url={r.url} hint={r.detail} /> : <><code>{r.url}</code>{r.detail && <div className="row-hint">{r.detail}</div>}</>}</td>
                          <td className="num">{r.wasted ? formatBytes(Math.round(r.wasted)) : r.wastedMs ? ms(r.wastedMs) : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </>
  );
}

function Diagnosis({ d }) {
  const lt = d.longTasks;
  return (
    <div className="section">
      {d.lcp && <LcpBreakdown lcp={d.lcp} />}
      <Opportunities items={d.opportunities} />
      {d.renderBlocking.length > 0 && (
        <Findings
          title="Render-blocking requests"
          badge={`${d.renderBlocking.length} · ${ms(d.renderBlocking.reduce((s, r) => s + r.ms, 0))}`}
          note="CSS and JS the browser must download before the first paint. Defer or async scripts, and inline only the critical CSS."
          empty=""
          rows={d.renderBlocking}
          columns={[
            { h: 'Request', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
            { h: 'Blocks for', num: true, sort: (r) => r.ms, cell: (r) => ms(r.ms) },
          ]}
        />
      )}
      <Findings
        title="Main-thread work"
        badge={lt.count ? `${lt.count} long ${lt.count === 1 ? 'task' : 'tasks'}` : d.mainThread.length || null}
        note={lt.count
          ? `${lt.count} long ${lt.count === 1 ? 'task' : 'tasks'} (${ms(lt.totalMs)} in total) block clicks and taps and raise TBT. Longest: ${ms(lt.longest.duration)} from ${shortUrl(lt.longest.url)}.`
          : 'No long tasks: the main thread stayed responsive.'}
        empty="No script execution was attributed to specific files."
        rows={d.mainThread}
        columns={[
          { h: 'Script', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
          { h: 'CPU time', num: true, sort: (r) => r.total, cell: (r) => ms(r.total) },
          { h: 'Evaluation', num: true, sort: (r) => r.scripting, cell: (r) => ms(r.scripting) },
          { h: 'Parse', num: true, sort: (r) => r.parse, cell: (r) => ms(r.parse) },
        ]}
      />
    </div>
  );
}

/** Tabla de hallazgos plegable; el resumen (badge) se ve sin abrirla. */
function Findings({ title, note, rows, columns, empty, badge }) {
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
  const summary = badge ?? (rows.length || null);
  return (
    <details className="acc">
      <summary>
        <h3 className="acc-title">{title}</h3>
        {summary ? <span className="badge">{summary}</span> : <span className="badge badge-muted">None</span>}
      </summary>
      <div className="acc-body">
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
      </div>
    </details>
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

      {t.findings.diagnosis && <Diagnosis d={t.findings.diagnosis} />}

      <div className="section">
        <Findings
          title="Five slowest API requests"
          badge={slowMax > 1 ? `slowest ${Math.round(slowMax)} ms` : null}
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
          badge={t.findings.bigImages.length ? `${t.findings.bigImages.length} · ${formatBytes(t.findings.bigImages.reduce((s, r) => s + r.size, 0))}` : null}
          note="Images above 200 KB transferred."
          empty="No images above the threshold."
          rows={t.findings.bigImages}
          columns={[
            { h: 'Image', url: true, sort: (r) => shortUrl(r.url), cell: (r) => (
              <div className="img-row">
                <ImageThumb url={r.url} />
                <div className="img-info"><CopyUrl url={r.url} hint={r.hint} link /></div>
              </div>
            ) },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
            ...(t.findings.diagnosis ? [{ h: 'Est. savings', num: true, sort: (r) => r.wasted ?? 0, cell: (r) => (r.wasted ? formatBytes(r.wasted) : '–') }] : []),
          ]}
        />
        <Findings
          title="Oversized JavaScript files"
          badge={t.findings.bigScripts.length ? `${t.findings.bigScripts.length} · ${formatBytes(t.findings.bigScripts.reduce((s, r) => s + r.size, 0))}` : null}
          note="Scripts above 150 KB transferred."
          empty="No scripts above the threshold."
          rows={t.findings.bigScripts}
          columns={[
            { h: 'Script', url: true, sort: (r) => shortUrl(r.url), cell: (r) => <CopyUrl url={r.url} /> },
            { h: 'Size', num: true, sort: (r) => r.size, cell: (r) => formatBytes(r.size) },
            ...(t.findings.diagnosis ? [{ h: 'Unused on load', num: true, sort: (r) => r.unused ?? 0, cell: (r) => (r.unused ? `${formatBytes(r.unused)} · ${Math.round((r.unused / r.size) * 100)}%` : '–') }] : []),
          ]}
        />
        {/* Pruebas antiguas sin diagnóstico: se mantiene la tabla de ahorros original. */}
        {!t.findings.diagnosis && savingsRows.length > 0 && (
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
