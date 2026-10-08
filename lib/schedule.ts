// Lógica pura de las pruebas programadas: validación y cálculo de la próxima ejecución.
// No lee el reloj ni el disco: recibe `now` y la zona horaria por parámetro.
import { compare, isSameSetup } from './compare.ts';
import { validateRequest, type TestRequest } from './validate.ts';
import type { Schedule, ScheduleEvery, ScheduledRun, TestRow, Comparison } from './types.ts';

const HOUR_MS = 3_600_000;
export const MAX_SCHEDULES = 20;
export const MAX_RUNS_PER_SCHEDULE = 50;
export const DEFAULT_TIME_OF_DAY = '08:00';
const EVERY_LIMITS = { hours: { min: 1, max: 168 }, days: { min: 1, max: 30 } } as const;

type Cadence = Pick<Schedule, 'every' | 'timeOfDay' | 'timezone'>;
export type ScheduleInput = TestRequest & Cadence & { enabled: boolean };

export const isValidTimezone = (timezone: string): boolean => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); return true; } catch { return false; }
};

function zonedParts(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(timestamp);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** Instante UTC en que el reloj de `timezone` marca la fecha y hora dadas (el mes y el día pueden desbordar). */
function zonedToTimestamp({ year, month, day, hour, minute }: ReturnType<typeof zonedParts>, timezone: string): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (timestamp: number) => {
    const shown = zonedParts(timestamp, timezone);
    return Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute) - Math.floor(timestamp / 60_000) * 60_000;
  };
  // Segunda pasada: el desfase puede cambiar si el instante cae al otro lado de un cambio de horario.
  const first = asUtc - offsetAt(asUtc);
  return asUtc - offsetAt(first);
}

const parseTimeOfDay = (timeOfDay: string) => {
  const [hour, minute] = timeOfDay.split(':').map(Number);
  return { hour, minute };
};

/** Primera ejecución de una programación recién creada. */
export function firstRun({ every, timeOfDay, timezone }: Cadence, now: number): number {
  if (every.unit === 'hours') return now + every.n * HOUR_MS;
  const today = zonedParts(now, timezone);
  const slot = zonedToTimestamp({ ...today, ...parseTimeOfDay(timeOfDay) }, timezone);
  return slot > now ? slot : zonedToTimestamp({ ...today, day: today.day + 1, ...parseTimeOfDay(timeOfDay) }, timezone);
}

/** Próxima ejecución tras correr (o saltarse) la de `from`. Si la laptop estuvo apagada, cuenta desde `from`, no desde lo perdido. */
export function nextRun({ every, timeOfDay, timezone }: Cadence, from: number): number {
  if (every.unit === 'hours') return from + every.n * HOUR_MS;
  const day = zonedParts(from, timezone);
  return zonedToTimestamp({ ...day, day: day.day + every.n, ...parseTimeOfDay(timeOfDay) }, timezone);
}

/** "Every 6 hours", "Every day at 08:00". */
export function describeEvery({ every, timeOfDay }: Pick<Schedule, 'every' | 'timeOfDay'>): string {
  if (every.unit === 'hours') return every.n === 1 ? 'Every hour' : `Every ${every.n} hours`;
  return every.n === 1 ? `Every day at ${timeOfDay}` : `Every ${every.n} days at ${timeOfDay}`;
}

export const isDue = (schedule: Pick<Schedule, 'enabled' | 'nextRunAt'>, now: number): boolean =>
  schedule.enabled && schedule.nextRunAt <= now;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function validateEvery(value: unknown): ScheduleEvery {
  const input = isRecord(value) ? value : {};
  const unit = input.unit === 'hours' || input.unit === 'days' ? input.unit : null;
  if (!unit) throw new Error('Choose hours or days.');
  const n = Number(input.n);
  const { min, max } = EVERY_LIMITS[unit];
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Repeat every ${min} to ${max} ${unit}.`);
  return { unit, n };
}

function validateTimeOfDay(value: unknown): string {
  const timeOfDay = String(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) throw new Error('Time of day must look like 08:30.');
  return timeOfDay;
}

function validateTimezone(value: unknown): string {
  const timezone = String(value);
  if (!isValidTimezone(timezone)) throw new Error('That time zone is not valid.');
  return timezone;
}

/** Valida el cuerpo de POST /api/schedules. Los campos de la prueba se validan con validateRequest. */
export function validateScheduleInput(body: unknown, defaultTimezone: string): ScheduleInput {
  const input = isRecord(body) ? body : {};
  const test = validateRequest(input);
  const every = validateEvery(input.every);
  const timeOfDay = validateTimeOfDay(input.timeOfDay ?? DEFAULT_TIME_OF_DAY);
  const timezone = validateTimezone(input.timezone ?? defaultTimezone);
  return { ...test, every, timeOfDay, timezone, enabled: input.enabled !== false };
}

export function buildSchedule(input: ScheduleInput, { id, now }: { id: string; now: number }): Schedule {
  return { id, ...input, createdAt: now, lastRunAt: null, nextRunAt: firstRun(input, now), activeJobId: null };
}

/** Cambios permitidos en una programación existente: pausar/reanudar y la frecuencia. Para otra URL o red, se crea una nueva. */
export function applyPatch(schedule: Schedule, body: unknown, now: number): Schedule {
  const input = isRecord(body) ? body : {};
  const every = input.every === undefined ? schedule.every : validateEvery(input.every);
  const timeOfDay = validateTimeOfDay(input.timeOfDay ?? schedule.timeOfDay);
  const timezone = validateTimezone(input.timezone ?? schedule.timezone);
  const enabled = input.enabled === undefined ? schedule.enabled : input.enabled === true;
  const cadenceChanged = every.unit !== schedule.every.unit || every.n !== schedule.every.n
    || timeOfDay !== schedule.timeOfDay || timezone !== schedule.timezone;
  const resumed = enabled && !schedule.enabled;
  const updated = { ...schedule, every, timeOfDay, timezone, enabled };
  return cadenceChanged || resumed ? { ...updated, nextRunAt: firstRun(updated, now) } : updated;
}

export type RunWithComparison = Omit<ScheduledRun, 'rows'> & { results: (TestRow & { comparison: Comparison | null })[] };

/** Corridas de una programación, la más nueva primero; cada fila se compara con la anterior de su misma configuración. */
export function attachComparisons(runs: ScheduledRun[]): RunWithComparison[] {
  const rows = runs.flatMap((run) => run.rows);
  return [...runs]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map(({ rows: runRows, ...run }) => ({
      ...run,
      results: runRows.map((row) => {
        const previous = rows.filter((other) => other.id < row.id && isSameSetup(other, row)).pop() ?? null;
        return { ...row, comparison: compare(row, previous) };
      }),
    }));
}
