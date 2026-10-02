import crypto from 'node:crypto';
import { runLighthouse } from './lighthouse.ts';
import { pickMedian } from './analyze.ts';
import type { Device, Job, PageType, TestResult } from './types.ts';

// Estado en memoria (el historial se guarda en el navegador, en localStorage) (sobrevive al hot-reload). Lighthouse corre de a una prueba a la vez
// para que las mediciones no compitan por CPU y se distorsionen entre sí.
const g = globalThis as typeof globalThis & {
  __jobs?: Map<string, Job>;
  __chain?: Promise<unknown>;
  __aborts?: Map<string, AbortController>;
  __runMs?: number[];
};
const jobs = (g.__jobs ??= new Map<string, Job>());
const aborts = (g.__aborts ??= new Map<string, AbortController>());
const runMs = (g.__runMs ??= []);
g.__chain ??= Promise.resolve();

// Duración estimada de una corrida hasta tener mediciones reales.
const DEFAULT_RUN_MS = 45_000;
const isActive = (j: Job) => j.status === 'queued' || j.status === 'running';

export const getJob = (id: string): Job | null => jobs.get(id) || null;

/** Pruebas por delante en la cola y tiempo restante estimado (incluye la propia). */
export function queueInfo(job: Job): { position: number; etaMs: number } {
  if (!isActive(job)) return { position: 0, etaMs: 0 };
  const avg = runMs.length ? runMs.reduce((s, v) => s + v, 0) / runMs.length : DEFAULT_RUN_MS;
  let position = 0;
  let pendingRuns = 0;
  for (const j of jobs.values()) {
    if (j === job) break; // el Map conserva el orden de llegada
    if (!isActive(j)) continue;
    position++;
    pendingRuns += j.progress.total - j.progress.done;
  }
  pendingRuns += job.progress.total - job.progress.done;
  return { position, etaMs: Math.round(pendingRuns * avg) };
}

export function enqueue({ url, pageType, devices, runs }: { url: string; pageType: PageType; devices: Device[]; runs: number }): Job {
  const id = crypto.randomUUID();
  const job: Job = {
    id, batchId: id, url, pageType, devices, runs,
    status: 'queued',
    progress: { done: 0, total: devices.length * runs, label: 'Waiting in queue' },
    errors: [],
    results: [],
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  // Limpieza de trabajos antiguos (nunca los que siguen en la cola)
  if (jobs.size > 50) {
    for (const [k, j] of jobs) {
      if (jobs.size <= 50) break;
      if (!isActive(j)) jobs.delete(k);
    }
  }

  g.__chain = g.__chain!.then(() => runJob(job)).catch(() => {});
  return job;
}

/** Cancela una prueba en cola o en ejecución. Devuelve false si ya había terminado. */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || !isActive(job)) return false;
  if (job.status === 'queued') {
    job.status = 'cancelled';
    job.progress.label = 'Cancelled';
  } else {
    aborts.get(id)?.abort(new Error('Cancelled'));
  }
  return true;
}

async function runJob(job: Job) {
  if (job.status === 'cancelled') return;
  job.status = 'running';
  const controller = new AbortController();
  aborts.set(job.id, controller);
  let saved = 0;
  try {
    for (const device of job.devices) {
      const results: TestResult[] = [];
      for (let i = 1; i <= job.runs; i++) {
        job.progress.label = `${device === 'mobile' ? 'Mobile' : 'Desktop'} · run ${i} of ${job.runs}`;
        const started = Date.now();
        try {
          results.push(await runLighthouse(job.url, device, controller.signal));
        } catch (e) {
          if (controller.signal.aborted) throw e;
          job.errors.push({ device, message: e instanceof Error ? e.message : String(e) });
          job.progress.done += job.runs - i + 1; // no reintentar el resto de este dispositivo
          break;
        }
        runMs.push(Date.now() - started);
        if (runMs.length > 10) runMs.shift();
        job.progress.done += 1;
      }
      if (results.length) {
        job.results.push({ device, runs: results.length, result: pickMedian(results) });
        saved++;
      }
    }
    job.status = saved > 0 ? 'done' : 'error';
    job.progress.label = saved > 0 ? 'Finished' : 'Failed';
  } catch {
    // Cancelada durante la ejecución: se descartan los resultados parciales.
    job.status = 'cancelled';
    job.progress.label = 'Cancelled';
    job.results = [];
  } finally {
    aborts.delete(job.id);
  }
}
