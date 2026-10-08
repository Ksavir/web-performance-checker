import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { RATING, RATING_PILL, WARN } from '../ui/styles';
import Fix from './Fix';

const RATING_WORD = { good: 'Good', ok: 'Needs improvement', poor: 'Poor', none: '–' };
const VISIBLE_FIXES = 6;
const SUMMARY_NOTE = 'mt-2 mb-0 text-[13px] text-muted';
const SECTION_HEADING = 'm-0 mb-2.5 text-[15px] font-bold';
const CHANGE_TONES = { worse: 'bg-poor-soft text-poor-ink', better: 'bg-good-soft text-good-ink' };

function Verdict({ summary }) {
  return (
    <section className={`rounded-sm border border-l-4 border-line border-l-(color:--c) bg-sunken px-[18px] py-4 ${RATING[summary.rating]}`} aria-label="Verdict">
      <span className={`${RATING_PILL} inline-block px-2.5 py-px text-xs`}>{RATING_WORD[summary.rating]}</span>
      <h3 className="mt-2 mb-1 text-lg leading-[1.3] font-bold tracking-[-0.01em]">{summary.headline}</h3>
      <p className="m-0 text-sm text-muted">{summary.detail}</p>
      <ul className="mt-3.5 mb-0 grid list-none grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2 p-0">
        {summary.vitals.map((vital) => (
          <li key={vital.key} className={`grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 rounded-sm border border-line bg-panel px-3 py-2 ${RATING[vital.rating]}`}>
            <span className="size-2 self-center rounded-full bg-(color:--c)" aria-hidden="true" />
            <span className="text-[12.5px] font-semibold text-muted">{vital.label}</span>
            <strong className="text-right text-[15px]">{vital.value}</strong>
            <span className="col-span-full text-xs text-muted">{RATING_WORD[vital.rating]} · goal {vital.target}</span>
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
    <ul className={`m-0 grid list-none gap-1 rounded-sm px-3.5 py-2.5 text-[13.5px] ${CHANGE_TONES[status]}`} aria-label={label}>
      {changes.map((change) => (
        <li key={change} className="flex items-baseline gap-2"><span aria-hidden="true">{arrow}</span><span className="sr-only">{status === 'better' ? 'Better: ' : 'Worse: '}</span>{change}</li>
      ))}
    </ul>
  );
}

function Changes({ changes }) {
  const hasChanges = changes.worse.length + changes.better.length > 0;
  return (
    <section aria-label="Changes since the previous test">
      <h3 className={SECTION_HEADING}>Since the previous test <span className="text-[13px] font-normal text-muted">({formatDate(changes.since, { format: 'short' })})</span></h3>
      {hasChanges ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2">
          <ChangeList changes={changes.worse} status="worse" label="Got worse" />
          <ChangeList changes={changes.better} status="better" label="Improved" />
        </div>
      ) : <p className={SUMMARY_NOTE}>No significant change.</p>}
      {changes.singleRun && hasChanges && (
        <p className={SUMMARY_NOTE}>This test used a single run per device, which can swing noticeably between runs. Use 3 runs for a steadier comparison.</p>
      )}
    </section>
  );
}

function Fixes({ actions }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? actions : actions.slice(0, VISIBLE_FIXES);
  const hidden = actions.length - VISIBLE_FIXES;
  if (!actions.length) return <p className={SUMMARY_NOTE}>Nothing to fix: Lighthouse found no relevant opportunities for this page.</p>;
  return (
    <>
      <ol className="m-0 grid list-none gap-2.5 p-0">{shown.map((action, index) => <Fix key={action.id} number={index + 1} action={action} />)}</ol>
      {hidden > 0 && (
        <button type="button" className="mt-2.5 cursor-pointer rounded-sm border border-line-strong bg-panel px-4 py-2 text-[13.5px] font-semibold transition-colors hover:bg-sunken" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
          {showAll ? 'Show fewer suggestions' : `Show ${hidden} more ${hidden === 1 ? 'suggestion' : 'suggestions'}`}
        </button>
      )}
    </>
  );
}

/** Pestaña Summarize: veredicto, cambios, qué arreglar primero y qué funciona. */
export default function Summary({ summary }) {
  return (
    <div className="grid gap-6 p-6">
      <Verdict summary={summary} />
      {summary.caveats.length > 0 && (
        <div className={WARN} role="note"><strong>Check these before trusting the numbers</strong>
          <ul>{summary.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
        </div>
      )}
      {summary.changes && <Changes changes={summary.changes} />}
      <section aria-label="Suggested fixes">
        <h3 className={SECTION_HEADING}>What to fix, in priority order</h3>
        <Fixes actions={summary.actions} />
      </section>
      {summary.working.length > 0 && (
        <section aria-label="What is working">
          <h3 className={SECTION_HEADING}>What is working</h3>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-5 gap-y-1.5 p-0 text-[13.5px]">
            {summary.working.map((item) => <li key={item} className="flex items-baseline gap-2"><span className="inline-grid size-[18px] flex-none place-items-center rounded-full bg-good-soft text-[11px] font-bold text-good" aria-hidden="true">✓</span>{item}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
