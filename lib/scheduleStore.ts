// Programaciones y resultados guardados en el servidor, en archivos JSON dentro de `dir` (p. ej. data/).
// Las lecturas y escrituras son síncronas: en un solo proceso no hay cruces entre leer y escribir.
import fs from 'node:fs';
import path from 'node:path';
import { MAX_RUNS_PER_SCHEDULE } from './schedule.ts';
import type { Schedule, ScheduledRun } from './types.ts';

export interface ScheduleStore {
  listSchedules(): Schedule[];
  getSchedule(id: string): Schedule | null;
  saveSchedule(schedule: Schedule): void;
  /** Borra la programación y todas sus corridas. */
  deleteSchedule(id: string): boolean;
  /** Corridas en orden cronológico. */
  listRuns(scheduleId: string): ScheduledRun[];
  /** Guarda una corrida; las filas reciben ids nuevos. Descarta las más antiguas por encima del tope. */
  addRun(run: ScheduledRun): ScheduledRun;
}

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

/** Escribe a un archivo temporal y lo renombra, para no dejar un JSON a medias si el proceso se corta. */
function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value));
  fs.renameSync(temp, file);
}

export function createScheduleStore(dir: string): ScheduleStore {
  const schedulesFile = path.join(dir, 'schedules.json');
  const runsFile = path.join(dir, 'scheduled-runs.json');
  const readSchedules = () => {
    const schedules = readJson<unknown>(schedulesFile, []);
    return Array.isArray(schedules) ? (schedules as Schedule[]) : [];
  };
  const readRuns = () => {
    const runs = readJson<unknown>(runsFile, []);
    return Array.isArray(runs) ? (runs as ScheduledRun[]) : [];
  };

  return {
    listSchedules: readSchedules,
    getSchedule: (id) => readSchedules().find((schedule) => schedule.id === id) ?? null,

    saveSchedule(schedule) {
      const schedules = readSchedules();
      const index = schedules.findIndex((existing) => existing.id === schedule.id);
      if (index === -1) schedules.push(schedule); else schedules[index] = schedule;
      writeJson(schedulesFile, schedules);
    },

    deleteSchedule(id) {
      const schedules = readSchedules();
      if (!schedules.some((schedule) => schedule.id === id)) return false;
      writeJson(schedulesFile, schedules.filter((schedule) => schedule.id !== id));
      writeJson(runsFile, readRuns().filter((run) => run.scheduleId !== id));
      return true;
    },

    listRuns: (scheduleId) => readRuns().filter((run) => run.scheduleId === scheduleId),

    addRun(run) {
      const all = readRuns();
      let nextRowId = all.reduce((max, existing) => existing.rows.reduce((m, row) => Math.max(m, row.id), max), 0) + 1;
      const saved = { ...run, rows: run.rows.map((row) => ({ ...row, id: nextRowId++ })) };
      all.push(saved);
      const own = all.filter((existing) => existing.scheduleId === run.scheduleId);
      const dropped = new Set(own.slice(0, Math.max(0, own.length - MAX_RUNS_PER_SCHEDULE)).map((existing) => existing.id));
      writeJson(runsFile, all.filter((existing) => !dropped.has(existing.id)));
      return saved;
    },
  };
}
