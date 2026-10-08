import { describe, it, expect } from 'vitest';
import { applyPatch, attachComparisons, buildSchedule, firstRun, isDue, nextRun, validateScheduleInput } from './schedule.ts';
import type { Schedule, ScheduledRun, TestRow } from './types.ts';

const at = (iso: string) => Date.parse(iso);
const MEXICO = { timezone: 'America/Mexico_City', timeOfDay: '08:00' }; // UTC-6 todo el año
const NEW_YORK = { timezone: 'America/New_York', timeOfDay: '08:00' };
const BODY = { url: 'example.com', pageType: 'homepage', devices: ['mobile'], runs: 1, every: { unit: 'hours', n: 6 } };

describe('firstRun', () => {
  it('suma las horas indicadas a partir de ahora', () => {
    // Arrange
    const now = at('2026-03-10T12:00:00Z');

    // Act
    const next = firstRun({ ...MEXICO, every: { unit: 'hours', n: 3 } }, now);

    // Assert
    expect(next).toBe(at('2026-03-10T15:00:00Z'));
  });

  it('con frecuencia diaria elige la hora de hoy si todavía no pasó', () => {
    // Arrange: 06:00 en Ciudad de México
    const now = at('2026-03-10T12:00:00Z');

    // Act
    const next = firstRun({ ...MEXICO, every: { unit: 'days', n: 1 } }, now);

    // Assert: hoy a las 08:00 locales
    expect(next).toBe(at('2026-03-10T14:00:00Z'));
  });

  it('con frecuencia diaria pasa a mañana si la hora de hoy ya pasó', () => {
    // Arrange: 14:00 en Ciudad de México
    const now = at('2026-03-10T20:00:00Z');

    // Act
    const next = firstRun({ ...MEXICO, every: { unit: 'days', n: 1 } }, now);

    // Assert
    expect(next).toBe(at('2026-03-11T14:00:00Z'));
  });
});

describe('nextRun', () => {
  it('suma las horas desde el momento indicado', () => {
    // Arrange
    const from = at('2026-03-10T12:00:00Z');

    // Act
    const next = nextRun({ ...MEXICO, every: { unit: 'hours', n: 12 } }, from);

    // Assert
    expect(next).toBe(at('2026-03-11T00:00:00Z'));
  });

  it('cada 2 días conserva la hora local', () => {
    // Arrange
    const from = at('2026-03-10T14:00:00Z');

    // Act
    const next = nextRun({ ...MEXICO, every: { unit: 'days', n: 2 } }, from);

    // Assert
    expect(next).toBe(at('2026-03-12T14:00:00Z'));
  });

  it('mantiene las 08:00 locales al cruzar el cambio de horario de verano', () => {
    // Arrange: 08:00 EST del 7 de marzo; el 8 empieza el horario de verano en Nueva York
    const from = at('2026-03-07T13:00:00Z');

    // Act
    const next = nextRun({ ...NEW_YORK, every: { unit: 'days', n: 1 } }, from);

    // Assert: 08:00 EDT = 12:00 UTC
    expect(next).toBe(at('2026-03-08T12:00:00Z'));
  });

  it('pasa de mes cuando los días se desbordan', () => {
    // Arrange
    const from = at('2026-03-31T14:00:00Z');

    // Act
    const next = nextRun({ ...MEXICO, every: { unit: 'days', n: 1 } }, from);

    // Assert
    expect(next).toBe(at('2026-04-01T14:00:00Z'));
  });
});

describe('isDue', () => {
  it.each([
    ['venció y está activa', true, 1000, 2000, true],
    ['justo en su hora', true, 2000, 2000, true],
    ['todavía no llega', true, 3000, 2000, false],
    ['venció pero está pausada', false, 1000, 2000, false],
  ])('%s', (_name, enabled, nextRunAt, now, expected) => {
    // Arrange / Act
    const due = isDue({ enabled, nextRunAt }, now);

    // Assert
    expect(due).toBe(expected);
  });
});

describe('validateScheduleInput', () => {
  it('normaliza la prueba y aplica la hora y la zona por defecto', () => {
    // Arrange / Act
    const input = validateScheduleInput(BODY, 'America/Mexico_City');

    // Assert
    expect(input).toMatchObject({
      url: 'https://example.com/', every: { unit: 'hours', n: 6 }, timeOfDay: '08:00', timezone: 'America/Mexico_City', enabled: true,
    });
  });

  it.each([
    ['sin unidad', { every: { n: 2 } }],
    ['unidad desconocida', { every: { unit: 'weeks', n: 1 } }],
    ['horas por encima del máximo', { every: { unit: 'hours', n: 169 } }],
    ['días por encima del máximo', { every: { unit: 'days', n: 31 } }],
    ['cero repeticiones', { every: { unit: 'hours', n: 0 } }],
    ['repeticiones decimales', { every: { unit: 'hours', n: 1.5 } }],
    ['hora con formato inválido', { timeOfDay: '8am' }],
    ['hora fuera de rango', { timeOfDay: '25:00' }],
    ['zona horaria inexistente', { timezone: 'Mars/Olympus' }],
    ['URL inválida', { url: '' }],
  ])('rechaza %s', (_name, override) => {
    // Arrange
    const body = { ...BODY, ...override };

    // Act / Assert
    expect(() => validateScheduleInput(body, 'UTC')).toThrow();
  });
});

describe('buildSchedule y applyPatch', () => {
  const now = at('2026-03-10T12:00:00Z');
  const base = (): Schedule => buildSchedule(validateScheduleInput(BODY, 'UTC'), { id: 's1', now });

  it('crea la programación sin corridas previas y con la primera ejecución calculada', () => {
    // Arrange / Act
    const schedule = base();

    // Assert
    expect(schedule).toMatchObject({ id: 's1', lastRunAt: null, activeJobId: null, nextRunAt: at('2026-03-10T18:00:00Z') });
  });

  it('pausar no mueve la próxima ejecución', () => {
    // Arrange
    const schedule = base();

    // Act
    const paused = applyPatch(schedule, { enabled: false }, now + 1000);

    // Assert
    expect(paused).toMatchObject({ enabled: false, nextRunAt: schedule.nextRunAt });
  });

  it('reanudar recalcula la próxima ejecución para no disparar de golpe una atrasada', () => {
    // Arrange
    const paused = { ...base(), enabled: false, nextRunAt: at('2026-03-01T00:00:00Z') };

    // Act
    const resumed = applyPatch(paused, { enabled: true }, now);

    // Assert
    expect(resumed.nextRunAt).toBe(at('2026-03-10T18:00:00Z'));
  });

  it('cambiar la frecuencia recalcula la próxima ejecución', () => {
    // Arrange
    const schedule = base();

    // Act
    const updated = applyPatch(schedule, { every: { unit: 'hours', n: 1 } }, now);

    // Assert
    expect(updated.nextRunAt).toBe(at('2026-03-10T13:00:00Z'));
  });

  it('rechaza una frecuencia inválida', () => {
    // Arrange / Act / Assert
    expect(() => applyPatch(base(), { every: { unit: 'hours', n: 500 } }, now)).toThrow();
  });
});

describe('attachComparisons', () => {
  const row = (id: number, score: number): TestRow => ({
    id, batchId: `b${id}`, url: 'https://example.com/', pageType: 'homepage', device: 'mobile', createdAt: '2026-03-10T00:00:00Z', runs: 1,
    network: 'slow4g', score, lcp: 2000, fcp: 1000, tbt: 100, cls: 0.01, pageSize: 1000, requestCount: 10, warnings: [],
    findings: { slowApis: [], bigImages: [], bigScripts: [], savings: {} },
  });
  const run = (id: number, startedAt: number, score: number): ScheduledRun => ({ id: `b${id}`, scheduleId: 's1', startedAt, status: 'done', errors: [], rows: [row(id, score)] });

  it('ordena las corridas de la más nueva a la más antigua y compara cada una con la anterior', () => {
    // Arrange
    const runs = [run(1, 1000, 60), run(2, 2000, 80)];

    // Act
    const [newest, oldest] = attachComparisons(runs);

    // Assert
    expect(newest.results[0].comparison?.deltas.score).toMatchObject({ previous: 60, current: 80, status: 'better' });
    expect(oldest.results[0].comparison).toBeNull();
  });
});
