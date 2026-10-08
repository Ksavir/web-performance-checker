import { formatEta } from '@/lib/format';
import { GHOST_BUTTON, HINT, PANEL } from '../ui/styles';

const MIN_BAR_PERCENT = 4; // para que la barra se vea desde el inicio

function describeStep(job) {
  const ahead = job.status === 'queued' ? job.position ?? 0 : 0;
  if (ahead > 0) return `Waiting in queue · ${ahead} ${ahead === 1 ? 'test' : 'tests'} ahead`;
  return job.progress.label;
}

/** Progreso de la prueba en curso, con el tiempo estimado y el botón para cancelar. */
export default function JobProgress({ job, cancelling, onCancel }) {
  const percent = Math.round((job.progress.done / Math.max(job.progress.total, 1)) * 100);
  return (
    <div className={`${PANEL} px-5 py-4`} role="status" aria-live="polite">
      <div className="flex justify-between gap-3"><strong>{describeStep(job)}</strong><span className="text-muted">{percent}%</span></div>
      <div className="mt-2.5 mb-2 h-1.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-400 motion-safe:ease-out" style={{ width: `${Math.max(percent, MIN_BAR_PERCENT)}%` }} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={HINT}>{job.etaMs ? formatEta(job.etaMs) : 'Takes 30–90 seconds per run'}</span>
        <button type="button" className={`${GHOST_BUTTON} px-3.5 py-[5px] text-[13.5px] enabled:hover:border-poor-border enabled:hover:bg-poor-soft enabled:hover:text-poor`} onClick={onCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel'}</button>
      </div>
    </div>
  );
}
