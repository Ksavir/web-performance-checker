import { useState } from 'react';
import { DEVICES, PAGE_TYPES, rate } from '@/lib/config';
import { formatDate, shortUrl } from '@/lib/format';
import { describeEvery } from '@/lib/schedule';
import Icon from '../ui/Icon';
import { DANGER_BUTTON, GHOST_BUTTON, RATING, RATING_PILL } from '../ui/styles';

const SMALL_BUTTON = 'px-2.5 py-1 text-[12.5px]';
const formatTime = (timestamp) => formatDate(new Date(timestamp).toISOString(), { format: 'short' });

function Scores({ scores }) {
  return DEVICES.filter((device) => scores[device.id] != null).map((device) => (
    <span key={device.id} className={`${RATING_PILL} ${RATING[rate('score', scores[device.id])]} ml-1 inline-block px-2 text-xs`} title={device.id}>
      {device.short} {scores[device.id]}
    </span>
  ));
}

function statusText(schedule) {
  if (schedule.running) return 'Running now…';
  if (!schedule.enabled) return 'Paused';
  return `Next run: ${formatTime(schedule.nextRunAt)}`;
}

/** Lista de corridas guardadas de una programación; al elegir una se abre en el panel de resultados. */
function RunList({ runs, onOpen }) {
  if (!runs) return <p className="m-0 text-[12.5px] text-muted">Loading…</p>;
  if (runs.length === 0) return <p className="m-0 text-[12.5px] text-muted">No runs yet.</p>;
  return (
    <ul className="m-0 grid max-h-52 list-none gap-0.5 overflow-y-auto p-0">
      {runs.map((run) => (
        <li key={run.id}>
          <button type="button" disabled={run.status === 'error'} onClick={() => onOpen(run)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xs border-0 bg-transparent px-2 py-1.5 text-left text-[12.5px] hover:bg-sunken disabled:cursor-default disabled:hover:bg-transparent">
            <span>{formatTime(run.startedAt)}</span>
            {run.status === 'error'
              ? <span className="text-poor" title={run.errors.map((error) => `${error.device}: ${error.message}`).join('\n')}>Failed</span>
              : <span><Scores scores={Object.fromEntries(run.results.map((row) => [row.device, row.score]))} /></span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function ScheduleItem({ schedule, onSetEnabled, onRunNow, onDelete, onOpenRun, loadRuns }) {
  const [runs, setRuns] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const page = PAGE_TYPES.find((type) => type.id === schedule.pageType)?.label;

  const toggleRuns = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      try { setRuns(await loadRuns(schedule.id)); } catch { setRuns([]); }
    }
  };
  const runNow = async () => setMessage((await onRunNow(schedule.id)).error);

  return (
    <li className="rounded-sm border border-line p-2.5">
      <div className="text-[13.5px] font-semibold [overflow-wrap:anywhere]">{shortUrl(schedule.url, { includeSearch: false, hideRootPath: true })}</div>
      <div className="mt-[3px] text-[12.5px] text-muted">{page} · {describeEvery(schedule)}</div>
      <div className="mt-[3px] flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span>{statusText(schedule)}</span>
        {schedule.lastRun && (schedule.lastRun.status === 'error' ? <span className="text-poor">Last run failed</span> : <span><Scores scores={schedule.lastRun.scores} /></span>)}
      </div>
      {message && <div className="mt-1.5 text-[12.5px] text-poor" role="alert">{message}</div>}
      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-sm border border-poor-border bg-poor-soft px-2.5 py-2 text-[13px] text-poor-ink" role="alertdialog" aria-label="Confirm deleting this schedule">
          <span className="basis-full font-semibold">Delete this schedule and its saved runs?</span>
          <button type="button" className={`${DANGER_BUTTON} ${SMALL_BUTTON}`} onClick={() => onDelete(schedule.id)}>Delete</button>
          <button type="button" className={`${GHOST_BUTTON} ${SMALL_BUTTON}`} onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" className={`${GHOST_BUTTON} ${SMALL_BUTTON}`} onClick={toggleRuns} aria-expanded={expanded}>{expanded ? 'Hide runs' : 'Runs'}</button>
          <button type="button" className={`${GHOST_BUTTON} ${SMALL_BUTTON}`} onClick={runNow} disabled={schedule.running}>Run now</button>
          <button type="button" className={`${GHOST_BUTTON} ${SMALL_BUTTON}`} onClick={() => onSetEnabled(schedule.id, !schedule.enabled)}>{schedule.enabled ? 'Pause' : 'Resume'}</button>
          <button type="button" className="ml-auto grid size-7 cursor-pointer place-items-center rounded-xs border-0 bg-transparent p-0 text-faint hover:bg-poor-soft hover:text-poor"
            aria-label={`Delete schedule for ${shortUrl(schedule.url)}`} title="Delete this schedule" onClick={() => setConfirming(true)}><Icon name="trash" /></button>
        </div>
      )}
      {expanded && <div className="mt-2 border-t border-line pt-2"><RunList runs={runs} onOpen={onOpenRun} /></div>}
    </li>
  );
}
