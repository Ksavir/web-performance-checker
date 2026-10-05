'use client';
import { useState } from 'react';

const RATING_WORD = { good: 'Good', ok: 'Needs improvement', poor: 'Poor', none: '–' };
// Prioridad -> misma escala de color que las métricas (alta = rojo, media = ámbar, baja = neutro).
const PRIORITY = { high: { label: 'High priority', cls: 'r-poor' }, medium: { label: 'Medium', cls: 'r-ok' }, low: { label: 'Low', cls: 'r-none' } };
const VISIBLE = 6;

const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ms = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
const kb = (v) => (v >= 1024 * 1024 ? `${(v / 1024 / 1024).toFixed(2)} MB` : `${Math.round(v / 1024)} KB`);

function Fix({ n, a }) {
  const p = PRIORITY[a.priority];
  return (
    <li className="fix">
      <span className="fix-num" aria-hidden="true">{n}</span>
      <div className="fix-body">
        <div className="fix-head">
          <h4 className="fix-title">{a.title}</h4>
          <span className="fix-tags">
            <span className={`prio ${p.cls}`}>{p.label}</span>
            {a.savingsMs ? <span className="badge">−{ms(a.savingsMs)} {a.metric}</span> : null}
            {a.savingsBytes ? <span className="badge badge-muted">{kb(a.savingsBytes)}</span> : null}
          </span>
        </div>
        <p className="fix-why">{a.why}</p>
        {a.tip && <p className="fix-tip"><strong>How to fix:</strong> {a.tip}</p>}
        {a.where.length > 0 && (
          <div className="fix-where">
            <div className="mini-title">Where to look</div>
            <ul>
              {a.where.map((w, i) => (
                <li key={i}>
                  {w.href
                    ? <a className="url-link" href={w.href} target="_blank" rel="noopener noreferrer" title={`${w.href} (opens in a new tab)`}>{w.text}</a>
                    : <code>{w.text}</code>}
                  {w.detail && <span className="fix-detail"> · {w.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

export default function Summary({ summary: s }) {
  const [all, setAll] = useState(false);
  const shown = all ? s.actions : s.actions.slice(0, VISIBLE);
  const hidden = s.actions.length - VISIBLE;

  return (
    <div className="summary">
      <section className={`verdict r-${s.rating}`} aria-label="Verdict">
        <span className="verdict-badge">{RATING_WORD[s.rating]}</span>
        <h3 className="verdict-title">{s.headline}</h3>
        <p className="verdict-detail">{s.detail}</p>
        <ul className="vitals">
          {s.vitals.map((v) => (
            <li key={v.key} className={`vital r-${v.rating}`}>
              <span className="vital-dot" aria-hidden="true" />
              <span className="vital-name">{v.label}</span>
              <strong>{v.value}</strong>
              <span className="vital-note">{RATING_WORD[v.rating]} · goal {v.target}</span>
            </li>
          ))}
        </ul>
      </section>

      {s.caveats.length > 0 && (
        <div className="warn" role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{s.caveats.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {s.changes && (
        <section aria-label="Changes since the previous test">
          <h3 className="sum-h">Since the previous test <span className="sum-sub">({fmtDate(s.changes.since)})</span></h3>
          {s.changes.worse.length + s.changes.better.length === 0 ? (
            <p className="note">No significant change.</p>
          ) : (
            <div className="changes">
              {s.changes.worse.length > 0 && (
                <ul className="chg chg-worse" aria-label="Got worse">
                  {s.changes.worse.map((c) => <li key={c}><span aria-hidden="true">▼</span><span className="sr-only">Worse: </span>{c}</li>)}
                </ul>
              )}
              {s.changes.better.length > 0 && (
                <ul className="chg chg-better" aria-label="Improved">
                  {s.changes.better.map((c) => <li key={c}><span aria-hidden="true">▲</span><span className="sr-only">Better: </span>{c}</li>)}
                </ul>
              )}
            </div>
          )}
          {s.changes.singleRun && s.changes.worse.length + s.changes.better.length > 0 && (
            <p className="note">This test used a single run per device, which can swing noticeably between runs. Use 3 runs for a steadier comparison.</p>
          )}
        </section>
      )}

      <section aria-label="Suggested fixes">
        <h3 className="sum-h">What to fix, in priority order</h3>
        {s.actions.length === 0 ? (
          <p className="note">Nothing to fix: Lighthouse found no relevant opportunities for this page.</p>
        ) : (
          <>
            <ol className="fixes">{shown.map((a, i) => <Fix key={a.id} n={i + 1} a={a} />)}</ol>
            {hidden > 0 && (
              <button type="button" className="more-btn" onClick={() => setAll(!all)} aria-expanded={all}>
                {all ? 'Show fewer suggestions' : `Show ${hidden} more ${hidden === 1 ? 'suggestion' : 'suggestions'}`}
              </button>
            )}
          </>
        )}
      </section>

      {s.working.length > 0 && (
        <section aria-label="What is working">
          <h3 className="sum-h">What is working</h3>
          <ul className="working">
            {s.working.map((w) => <li key={w}><span className="check" aria-hidden="true">✓</span>{w}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
