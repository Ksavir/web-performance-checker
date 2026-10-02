import crypto from 'node:crypto';
import { runLighthouse } from './lighthouse.ts';
import { pickMedian } from './analyze.ts';
import type { Device, Job, PageType, TestResult } from './types.ts';

// Estado en memoria (el historial se guarda en el navegador, en localStorage) (sobrevive al hot-reload). Lighthouse corre de a una prueba a la vez
// para que las mediciones no compitan por CPU y se distorsionen entre sí.
const g = globalThis as typeof globalThis & { __jobs?: Map<string, Job>; __chain?: Promise<unknown> };
const jobs = (g.__jobs ??= new Map<string, Job>());
g.__chain ??= Promise.resolve();

export const getJob = (id: string): Job | null => jobs.get(id) || null;

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
  // Limpieza de trabajos antiguos
  if (jobs.size > 50) for (const k of [...jobs.keys()].slice(0, jobs.size - 50)) jobs.delete(k);

  g.__chain = g.__chain!.then(() => runJob(job)).catch(() => {});
  return job;
}

async function runJob(job: Job) {
  job.status = 'running';
  let saved = 0;
  for (const device of job.devices) {
    const results: TestResult[] = [];
    for (let i = 1; i <= job.runs; i++) {
      job.progress.label = `${device === 'mobile' ? 'Mobile' : 'Desktop'} · run ${i} of ${job.runs}`;
      try {
        results.push(await runLighthouse(job.url, device));
      } catch (e) {
        job.errors.push({ device, message: e instanceof Error ? e.message : String(e) });
        job.progress.done += job.runs - i + 1; // no reintentar el resto de este dispositivo
        break;
      }
      job.progress.done += 1;
    }
    if (results.length) {
      job.results.push({ device, runs: results.length, result: pickMedian(results) });
      saved++;
    }
  }
  job.status = saved > 0 ? 'done' : 'error';
  job.progress.label = saved > 0 ? 'Finished' : 'Failed';
}
