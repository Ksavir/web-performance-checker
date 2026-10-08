// Conecta el scheduler con la cola real, el disco y el reloj. Solo se importa desde código de servidor (Node).
import crypto from 'node:crypto';
import path from 'node:path';
import { enqueue, getJob } from './queue.ts';
import { dispatch, tick, type SchedulerDeps } from './scheduler.ts';
import { MAX_SCHEDULES, buildSchedule, validateScheduleInput } from './schedule.ts';
import { createScheduleStore } from './scheduleStore.ts';
import type { Schedule } from './types.ts';

const TICK_MS = 60_000;

// Guardado en globalThis para no duplicar el temporizador con el hot-reload de Next (igual que lib/queue.ts).
const state = globalThis as typeof globalThis & { __schedulerTimer?: ReturnType<typeof setInterval> };

const store = createScheduleStore(path.join(process.cwd(), 'data'));
const deps: SchedulerDeps = { store, enqueue, getJob, now: Date.now };

export const getScheduleStore = () => store;

/** Arranca el temporizador una sola vez. El primer tick lanza las programaciones que vencieron mientras la app estaba apagada. */
export function startScheduler() {
  if (state.__schedulerTimer) return;
  const run = () => { try { tick(deps); } catch (error) { console.error('Scheduler tick failed:', error); } };
  state.__schedulerTimer = setInterval(run, TICK_MS);
  state.__schedulerTimer.unref();
  run();
}

export function createSchedule(body: unknown): Schedule {
  if (store.listSchedules().length >= MAX_SCHEDULES) throw new Error(`You can have up to ${MAX_SCHEDULES} schedules. Delete one first.`);
  const input = validateScheduleInput(body, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const schedule = buildSchedule(input, { id: crypto.randomUUID(), now: Date.now() });
  store.saveSchedule(schedule);
  return schedule;
}

/** "Run now": lanza una corrida sin cambiar el calendario. Devuelve false si la anterior sigue en la cola. */
export function runScheduleNow(schedule: Schedule): boolean {
  return dispatch(schedule, deps, { advance: false }) !== null;
}
