import { formatEta } from '@/lib/format';

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
    <div className="progress" role="status" aria-live="polite">
      <div className="progress-head"><strong>{describeStep(job)}</strong><span>{percent}%</span></div>
      <div className="bar"><span style={{ width: `${Math.max(percent, MIN_BAR_PERCENT)}%` }} /></div>
      <div className="progress-foot">
        <span className="hint">{job.etaMs ? formatEta(job.etaMs) : 'Takes 30–90 seconds per run'}</span>
        <button type="button" className="ghost-btn" onClick={onCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel'}</button>
      </div>
    </div>
  );
}
