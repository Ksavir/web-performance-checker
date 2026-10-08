// Dispara las pruebas programadas que ya vencieron. Recibe la cola, el almacén y el reloj por parámetro
// (ver lib/schedulerRuntime.ts, que los conecta). Corre en el servidor.
import { isActiveJob } from './estimate.ts';
import { isDue, nextRun } from './schedule.ts';
import type { ScheduleStore } from './scheduleStore.ts';
import type { Job, Schedule, ScheduledRun, TestRow } from './types.ts';
import type { TestRequest } from './validate.ts';

export interface SchedulerDeps {
  store: ScheduleStore;
  enqueue: (params: TestRequest, onFinish: (job: Job) => void) => Job;
  getJob: (id: string) => Job | null;
  now: () => number;
}

/** Filas de una corrida terminada, en el orden de los dispositivos probados. */
export function buildRun(schedule: Schedule, job: Job): ScheduledRun {
  const createdAt = new Date(job.createdAt).toISOString();
  const rows = job.results.map(({ device, runs, result }): TestRow => ({
    ...result, id: 0, batchId: job.batchId, url: job.url, pageType: job.pageType, device, createdAt, runs, network: job.network,
  }));
  return {
    id: job.batchId, scheduleId: schedule.id, startedAt: job.createdAt,
    status: job.status === 'done' ? 'done' : 'error', errors: job.errors, rows,
  };
}

const hasActiveJob = (schedule: Schedule, deps: SchedulerDeps) => {
  const job = schedule.activeJobId ? deps.getJob(schedule.activeJobId) : null;
  return job !== null && isActiveJob(job);
};

/** Guarda el resultado en el almacén cuando el trabajo termina. Si la programación se borró mientras tanto, lo descarta. */
function recordFinished(scheduleId: string, job: Job, { store }: SchedulerDeps) {
  const schedule = store.getSchedule(scheduleId);
  if (!schedule) return;
  if (job.status === 'done' || job.status === 'error') store.addRun(buildRun(schedule, job));
  if (schedule.activeJobId === job.id) store.saveSchedule({ ...schedule, activeJobId: null });
}

/**
 * Encola una corrida de `schedule`. Devuelve null si la anterior sigue en la cola (no se apilan).
 * `advance` mueve la próxima ejecución; "Run now" lo deja en false para no alterar el calendario.
 */
export function dispatch(schedule: Schedule, deps: SchedulerDeps, { advance }: { advance: boolean }): Job | null {
  const now = deps.now();
  if (hasActiveJob(schedule, deps)) return null;
  const { url, pageType, devices, runs, network } = schedule;
  const job = deps.enqueue({ url, pageType, devices, runs, network }, (finished) => recordFinished(schedule.id, finished, deps));
  deps.store.saveSchedule({ ...schedule, lastRunAt: now, activeJobId: job.id, nextRunAt: advance ? nextRun(schedule, now) : schedule.nextRunAt });
  return job;
}

/**
 * Revisa las programaciones y lanza las vencidas. Una programación atrasada (p. ej. la laptop estuvo apagada)
 * corre una sola vez y su próxima ejecución se cuenta desde ahora. Devuelve los ids de las programaciones lanzadas.
 */
export function tick(deps: SchedulerDeps): string[] {
  const now = deps.now();
  const launched: string[] = [];
  for (const schedule of deps.store.listSchedules()) {
    if (!isDue(schedule, now)) continue;
    if (dispatch(schedule, deps, { advance: true })) launched.push(schedule.id);
    else deps.store.saveSchedule({ ...schedule, nextRunAt: nextRun(schedule, now) });
  }
  return launched;
}
