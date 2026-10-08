import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { MAX_RUNS_PER_SCHEDULE, buildSchedule, validateScheduleInput } from './schedule.ts';
import { createScheduleStore } from './scheduleStore.ts';
import type { ScheduledRun, TestRow } from './types.ts';

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-store-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const schedule = (id: string) => buildSchedule(
  validateScheduleInput({ url: 'example.com', pageType: 'homepage', devices: ['mobile'], every: { unit: 'hours', n: 1 } }, 'UTC'),
  { id, now: 0 },
);
const row = { score: 80, device: 'mobile' } as TestRow;
const run = (id: string, scheduleId: string, startedAt = 0): ScheduledRun => ({ id, scheduleId, startedAt, status: 'done', errors: [], rows: [{ ...row }, { ...row }] });

describe('createScheduleStore', () => {
  it('devuelve listas vacías si todavía no hay archivos', () => {
    // Arrange / Act
    const store = createScheduleStore(path.join(dir, 'nueva'));

    // Assert
    expect(store.listSchedules()).toEqual([]);
    expect(store.listRuns('x')).toEqual([]);
  });

  it('guarda y actualiza una programación sin duplicarla', () => {
    // Arrange
    const store = createScheduleStore(dir);
    store.saveSchedule(schedule('a'));

    // Act
    store.saveSchedule({ ...schedule('a'), enabled: false });

    // Assert
    expect(store.listSchedules()).toHaveLength(1);
    expect(store.getSchedule('a')?.enabled).toBe(false);
  });

  it('persiste entre instancias (como tras reiniciar el servidor)', () => {
    // Arrange
    createScheduleStore(dir).saveSchedule(schedule('a'));

    // Act
    const reopened = createScheduleStore(dir);

    // Assert
    expect(reopened.getSchedule('a')).not.toBeNull();
  });

  it('se recupera de un archivo corrupto', () => {
    // Arrange
    fs.writeFileSync(path.join(dir, 'schedules.json'), '{no es json');

    // Act
    const schedules = createScheduleStore(dir).listSchedules();

    // Assert
    expect(schedules).toEqual([]);
  });

  it('asigna ids únicos a las filas de todas las corridas', () => {
    // Arrange
    const store = createScheduleStore(dir);

    // Act
    store.addRun(run('r1', 'a'));
    store.addRun(run('r2', 'b'));

    // Assert
    const ids = [...store.listRuns('a'), ...store.listRuns('b')].flatMap((saved) => saved.rows.map((r) => r.id));
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('conserva solo las últimas corridas de cada programación', () => {
    // Arrange
    const store = createScheduleStore(dir);
    store.addRun(run('otra', 'b'));

    // Act
    for (let i = 0; i < MAX_RUNS_PER_SCHEDULE + 3; i++) store.addRun(run(`r${i}`, 'a', i));

    // Assert
    const kept = store.listRuns('a');
    expect(kept).toHaveLength(MAX_RUNS_PER_SCHEDULE);
    expect(kept[0].id).toBe('r3');
    expect(store.listRuns('b')).toHaveLength(1);
  });

  it('al borrar una programación borra también sus corridas', () => {
    // Arrange
    const store = createScheduleStore(dir);
    store.saveSchedule(schedule('a'));
    store.addRun(run('r1', 'a'));

    // Act
    const deleted = store.deleteSchedule('a');

    // Assert
    expect(deleted).toBe(true);
    expect(store.listRuns('a')).toEqual([]);
    expect(store.deleteSchedule('a')).toBe(false);
  });
});
