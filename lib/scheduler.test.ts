import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildSchedule, validateScheduleInput } from './schedule.ts';
import { dispatch, tick, type SchedulerDeps } from './scheduler.ts';
import { createScheduleStore } from './scheduleStore.ts';
import type { Job, TestResult } from './types.ts';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-03-10T12:00:00Z');
const BODY = { url: 'example.com', pageType: 'homepage', devices: ['mobile', 'desktop'], runs: 1, every: { unit: 'hours', n: 6 } };
const result: TestResult = {
  score: 77, lcp: 2000, fcp: 1000, tbt: 100, cls: 0.01, pageSize: 1000, requestCount: 10, warnings: [],
  findings: { slowApis: [], bigImages: [], bigScripts: [], savings: {} },
};

let dir: string;
let now: number;
let enqueued: { job: Job; finish: (job: Job) => void }[];

/** Cola falsa: guarda los trabajos para terminarlos a mano. */
function buildDeps(): SchedulerDeps {
  const jobs = new Map<string, Job>();
  return {
    store: createScheduleStore(dir),
    now: () => now,
    getJob: (id) => jobs.get(id) ?? null,
    enqueue: (params, finish) => {
      const id = `job${enqueued.length + 1}`;
      const job: Job = { ...params, id, batchId: id, status: 'queued', progress: { done: 0, total: 2, label: '' }, errors: [], results: [], createdAt: now };
      jobs.set(id, job);
      enqueued.push({ job, finish });
      return job;
    },
  };
}

const complete = ({ job, finish }: (typeof enqueued)[number]) => {
  job.status = 'done';
  job.results = job.devices.map((device) => ({ device, runs: 1, result }));
  finish(job);
};

const addSchedule = (deps: SchedulerDeps, patch: object = {}) => {
  const schedule = { ...buildSchedule(validateScheduleInput(BODY, 'UTC'), { id: 's1', now: NOW }), ...patch };
  deps.store.saveSchedule(schedule);
  return schedule;
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-'));
  now = NOW;
  enqueued = [];
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('tick', () => {
  it('no lanza nada si la próxima ejecución es futura', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);

    // Act
    const launched = tick(deps);

    // Assert
    expect(launched).toEqual([]);
    expect(enqueued).toHaveLength(0);
  });

  it('lanza la programación vencida y calcula la siguiente desde ahora', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;

    // Act
    const launched = tick(deps);

    // Assert
    expect(launched).toEqual(['s1']);
    expect(deps.store.getSchedule('s1')).toMatchObject({ lastRunAt: now, nextRunAt: now + 6 * HOUR, activeJobId: 'job1' });
  });

  it('tras una larga pausa lanza una sola corrida, no una por cada hora perdida', () => {
    // Arrange: la laptop estuvo apagada tres días
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 72 * HOUR;

    // Act
    tick(deps);
    tick(deps);

    // Assert
    expect(enqueued).toHaveLength(1);
  });

  it('ignora las programaciones pausadas', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps, { enabled: false });
    now = NOW + 7 * HOUR;

    // Act
    const launched = tick(deps);

    // Assert
    expect(launched).toEqual([]);
  });

  it('no apila otra corrida si la anterior sigue en la cola, y adelanta la próxima ejecución', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;
    tick(deps);
    now += 6 * HOUR;

    // Act
    const launched = tick(deps);

    // Assert
    expect(launched).toEqual([]);
    expect(enqueued).toHaveLength(1);
    expect(deps.store.getSchedule('s1')?.nextRunAt).toBe(now + 6 * HOUR);
  });
});

describe('al terminar la corrida', () => {
  it('guarda las filas por dispositivo y libera la programación', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;
    tick(deps);

    // Act
    complete(enqueued[0]);

    // Assert
    const [run] = deps.store.listRuns('s1');
    expect(run).toMatchObject({ id: 'job1', status: 'done', startedAt: now });
    expect(run.rows.map((row) => [row.device, row.score])).toEqual([['mobile', 77], ['desktop', 77]]);
    expect(deps.store.getSchedule('s1')?.activeJobId).toBeNull();
  });

  it('guarda la corrida fallida con sus errores', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;
    tick(deps);
    const { job, finish } = enqueued[0];

    // Act
    job.status = 'error';
    job.errors = [{ device: 'mobile', message: 'Timed out' }];
    finish(job);

    // Assert
    expect(deps.store.listRuns('s1')[0]).toMatchObject({ status: 'error', rows: [], errors: [{ device: 'mobile', message: 'Timed out' }] });
  });

  it('no guarda las corridas canceladas', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;
    tick(deps);
    const { job, finish } = enqueued[0];

    // Act
    job.status = 'cancelled';
    finish(job);

    // Assert
    expect(deps.store.listRuns('s1')).toEqual([]);
    expect(deps.store.getSchedule('s1')?.activeJobId).toBeNull();
  });

  it('descarta el resultado si la programación se borró mientras corría', () => {
    // Arrange
    const deps = buildDeps();
    addSchedule(deps);
    now = NOW + 7 * HOUR;
    tick(deps);
    deps.store.deleteSchedule('s1');

    // Act
    complete(enqueued[0]);

    // Assert
    expect(deps.store.listRuns('s1')).toEqual([]);
  });
});

describe('dispatch sin avanzar (Run now)', () => {
  it('no cambia la próxima ejecución y rechaza una segunda corrida simultánea', () => {
    // Arrange
    const deps = buildDeps();
    const schedule = addSchedule(deps);

    // Act
    const first = dispatch(schedule, deps, { advance: false });
    const second = dispatch(deps.store.getSchedule('s1')!, deps, { advance: false });

    // Assert
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(deps.store.getSchedule('s1')?.nextRunAt).toBe(schedule.nextRunAt);
  });
});
