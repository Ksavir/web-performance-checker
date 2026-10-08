import crypto from 'node:crypto';
import { runLighthouse } from './lighthouse.ts';
import { pickMedian } from './analyze.ts';
import { getDeviceLabel } from './config.ts';
import { averageRunMs, buildQueueInfo, isActiveJob, type QueueInfo } from './estimate.ts';
import type { Device, Job, Network, PageType, TestResult } from './types.ts';

// Estado en memoria guardado en globalThis para sobrevivir al hot-reload de Next.
// Las pruebas se ejecutan de una en una para que no compitan por CPU y se distorsionen.
const state = globalThis as typeof globalThis & {
  __jobs?: Map<string, Job>;
  __chain?: Promise<unknown>;
  __aborts?: Map<string, AbortController>;
  __runMs?: number[];
};
const jobs = (state.__jobs ??= new Map<string, Job>());
const aborts = (state.__aborts ??= new Map<string, AbortController>());
const runDurations = (state.__runMs ??= []);

const MAX_STORED_JOBS = 50;
const RUN_DURATION_SAMPLES = 10;

export const getJob = (id: string): Job | null => jobs.get(id) ?? null;

export function getQueueInfo(job: Job): QueueInfo {
  return buildQueueInfo({ job, queue: [...jobs.values()], avgRunMs: averageRunMs(runDurations) });
}

/** Borra los trabajos terminados más antiguos (nunca los que siguen en la cola). */
function pruneFinishedJobs() {
  for (const [id, job] of jobs) {
    if (jobs.size <= MAX_STORED_JOBS) break;
    if (!isActiveJob(job)) jobs.delete(id);
  }
}

interface EnqueueParams {
  url: string;
  pageType: PageType;
  devices: Device[];
  runs: number;
  network: Network;
}

/** `onFinish` se llama cuando la prueba termina (hecha, fallida o cancelada); un error dentro de él no afecta a la cola. */
export function enqueue({ url, pageType, devices, runs, network }: EnqueueParams, onFinish?: (job: Job) => void): Job {
  const id = crypto.randomUUID();
  const job: Job = {
    id, batchId: id, url, pageType, devices, runs, network,
    status: 'queued',
    progress: { done: 0, total: devices.length * runs, label: 'Waiting in queue' },
    errors: [],
    results: [],
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  pruneFinishedJobs();

  state.__chain = (state.__chain ?? Promise.resolve())
    .then(async () => {
      await runJob(job);
      onFinish?.(job);
    })
    .catch(() => {});
  return job;
}

/** Cancela una prueba en cola o en ejecución. Devuelve false si ya había terminado. */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || !isActiveJob(job)) return false;
  if (job.status === 'queued') {
    job.status = 'cancelled';
    job.progress.label = 'Cancelled';
  } else {
    aborts.get(id)?.abort(new Error('Cancelled'));
  }
  return true;
}

function recordRunDuration(ms: number) {
  runDurations.push(ms);
  if (runDurations.length > RUN_DURATION_SAMPLES) runDurations.shift();
}

/** Corre las ejecuciones de un dispositivo; si una falla, no reintenta las siguientes. */
async function runDevice(job: Job, device: Device, signal: AbortSignal): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (let run = 1; run <= job.runs; run++) {
    job.progress.label = `${getDeviceLabel(device)} · run ${run} of ${job.runs}`;
    const started = Date.now();
    try {
      results.push(await runLighthouse({ url: job.url, device, network: job.network, signal }));
    } catch (error) {
      if (signal.aborted) throw error;
      job.errors.push({ device, message: error instanceof Error ? error.message : String(error) });
      job.progress.done += job.runs - run + 1;
      break;
    }
    recordRunDuration(Date.now() - started);
    job.progress.done += 1;
  }
  return results;
}

async function runJob(job: Job) {
  if (job.status === 'cancelled') return;
  job.status = 'running';
  const controller = new AbortController();
  aborts.set(job.id, controller);
  try {
    for (const device of job.devices) {
      const results = await runDevice(job, device, controller.signal);
      if (results.length) job.results.push({ device, runs: results.length, result: pickMedian(results) });
    }
    const saved = job.results.length > 0;
    job.status = saved ? 'done' : 'error';
    job.progress.label = saved ? 'Finished' : 'Failed';
  } catch {
    // Cancelada durante la ejecución: se descartan los resultados parciales.
    job.status = 'cancelled';
    job.progress.label = 'Cancelled';
    job.results = [];
  } finally {
    aborts.delete(job.id);
  }
}
