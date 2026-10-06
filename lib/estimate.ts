// Cálculos puros sobre la cola: no leen ni modifican el estado de lib/queue.ts, lo reciben por parámetro.
import type { Job } from './types.ts';

// Duración estimada de una corrida hasta tener mediciones reales.
export const DEFAULT_RUN_MS = 45_000;

export interface QueueInfo {
  /** Pruebas activas por delante de esta. */
  position: number;
  /** Tiempo restante estimado, incluida la propia prueba. */
  etaMs: number;
}

export const isActiveJob = (job: Pick<Job, 'status'>) => job.status === 'queued' || job.status === 'running';

export function averageRunMs(samples: number[]): number {
  return samples.length ? samples.reduce((total, ms) => total + ms, 0) / samples.length : DEFAULT_RUN_MS;
}

type QueuedJob = Pick<Job, 'status' | 'progress'>;

/** `queue` va en orden de llegada e incluye a `job`. */
export function buildQueueInfo({ job, queue, avgRunMs }: { job: QueuedJob; queue: QueuedJob[]; avgRunMs: number }): QueueInfo {
  if (!isActiveJob(job)) return { position: 0, etaMs: 0 };
  const index = queue.indexOf(job);
  const ahead = (index === -1 ? queue : queue.slice(0, index)).filter(isActiveJob);
  const remainingRuns = (queued: QueuedJob) => queued.progress.total - queued.progress.done;
  const pendingRuns = ahead.reduce((total, queued) => total + remainingRuns(queued), remainingRuns(job));
  return { position: ahead.length, etaMs: Math.round(pendingRuns * avgRunMs) };
}
