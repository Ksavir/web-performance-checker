import crypto from 'node:crypto';
import { runLighthouse } from './lighthouse.js';
import { pickMedian } from './analyze.js';
import { saveTest } from './db.js';

// Estado en memoria (sobrevive al hot-reload). Lighthouse corre de a una prueba a la vez
// para que las mediciones no compitan por CPU y se distorsionen entre sí.
const jobs = (globalThis.__jobs ??= new Map());
globalThis.__chain ??= Promise.resolve();

export const getJob = (id) => jobs.get(id) || null;

export function enqueue({ url, pageType, devices, runs }) {
  const id = crypto.randomUUID();
  const job = {
    id, batchId: id, url, pageType, devices, runs,
    status: 'queued',
    progress: { done: 0, total: devices.length * runs, label: 'Waiting in queue' },
    errors: [],
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  // Limpieza de trabajos antiguos
  if (jobs.size > 50) for (const k of [...jobs.keys()].slice(0, jobs.size - 50)) jobs.delete(k);

  globalThis.__chain = globalThis.__chain.then(() => runJob(job)).catch(() => {});
  return job;
}

async function runJob(job) {
  job.status = 'running';
  let saved = 0;
  for (const device of job.devices) {
    const results = [];
    for (let i = 1; i <= job.runs; i++) {
      job.progress.label = `${device === 'mobile' ? 'Mobile' : 'Desktop'} · run ${i} of ${job.runs}`;
      try {
        results.push(await runLighthouse(job.url, device));
      } catch (e) {
        job.errors.push({ device, message: e.message });
        job.progress.done += job.runs - i + 1; // no reintentar el resto de este dispositivo
        break;
      }
      job.progress.done += 1;
    }
    if (results.length) {
      saveTest({ batchId: job.batchId, url: job.url, pageType: job.pageType, device, runs: results.length, result: pickMedian(results) });
      saved++;
    }
  }
  job.status = saved > 0 ? 'done' : 'error';
  job.progress.label = saved > 0 ? 'Finished' : 'Failed';
}
