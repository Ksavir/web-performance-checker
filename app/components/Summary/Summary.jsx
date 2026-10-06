import { useState } from 'react';
import { formatDate } from '@/lib/format';
import Fix from './Fix';

const RATING_WORD = { good: 'Good', ok: 'Needs improvement', poor: 'Poor', none: '–' };
const VISIBLE_FIXES = 6;

function Verdict({ summary }) {
  return (
    <section className={`verdict r-${summary.rating}`} aria-label="Verdict">
      <span className="verdict-badge">{RATING_WORD[summary.rating]}</span>
      <h3 className="verdict-title">{summary.headline}</h3>
      <p className="verdict-detail">{summary.detail}</p>
      <ul className="vitals">
        {summary.vitals.map((vital) => (
          <li key={vital.key} className={`vital r-${vital.rating}`}>
            <span className="vital-dot" aria-hidden="true" />
            <span className="vital-name">{vital.label}</span>
            <strong>{vital.value}</strong>
            <span className="vital-note">{RATING_WORD[vital.rating]} · goal {vital.target}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChangeList({ changes, status, label }) {
  if (!changes.length) return null;
  const arrow = status === 'better' ? '▲' : '▼';
  return (
    <ul className={`chg chg-${status}`} aria-label={label}>
      {changes.map((change) => (
        <li key={change}><span aria-hidden="true">{arrow}</span><span className="sr-only">{status === 'better' ? 'Better: ' : 'Worse: '}</span>{change}</li>
      ))}
    </ul>
  );
}

function Changes({ changes }) {
  const hasChanges = changes.worse.length + changes.better.length > 0;
  return (
    <section aria-label="Changes since the previous test">
      <h3 className="sum-h">Since the previous test <span className="sum-sub">({formatDate(changes.since, { format: 'short' })})</span></h3>
      {hasChanges ? (
        <div className="changes">
          <ChangeList changes={changes.worse} status="worse" label="Got worse" />
          <ChangeList changes={changes.better} status="better" label="Improved" />
        </div>
      ) : <p className="note">No significant change.</p>}
      {changes.singleRun && hasChanges && (
        <p className="note">This test used a single run per device, which can swing noticeably between runs. Use 3 runs for a steadier comparison.</p>
      )}
    </section>
  );
}

function Fixes({ actions }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? actions : actions.slice(0, VISIBLE_FIXES);
  const hidden = actions.length - VISIBLE_FIXES;
  if (!actions.length) return <p className="note">Nothing to fix: Lighthouse found no relevant opportunities for this page.</p>;
  return (
    <>
      <ol className="fixes">{shown.map((action, index) => <Fix key={action.id} number={index + 1} action={action} />)}</ol>
      {hidden > 0 && (
        <button type="button" className="more-btn" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
          {showAll ? 'Show fewer suggestions' : `Show ${hidden} more ${hidden === 1 ? 'suggestion' : 'suggestions'}`}
        </button>
      )}
    </>
  );
}

/** Pestaña Summarize: veredicto, cambios, qué arreglar primero y qué funciona. */
export default function Summary({ summary }) {
  return (
    <div className="summary">
      <Verdict summary={summary} />
      {summary.caveats.length > 0 && (
        <div className="warn" role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{summary.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
        </div>
      )}
      {summary.changes && <Changes changes={summary.changes} />}
      <section aria-label="Suggested fixes">
        <h3 className="sum-h">What to fix, in priority order</h3>
        <Fixes actions={summary.actions} />
      </section>
      {summary.working.length > 0 && (
        <section aria-label="What is working">
          <h3 className="sum-h">What is working</h3>
          <ul className="working">
            {summary.working.map((item) => <li key={item}><span className="check" aria-hidden="true">✓</span>{item}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
