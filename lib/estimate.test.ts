import { describe, it, expect } from 'vitest';
import { DEFAULT_RUN_MS, averageRunMs, buildQueueInfo } from './estimate.ts';
import type { Job } from './types.ts';

const buildJob = (status: Job['status'], done: number, total: number) => ({ status, progress: { done, total, label: '' } });

describe('averageRunMs', () => {
  it('usa la duración por defecto cuando aún no hay mediciones', () => {
    // Act
    const average = averageRunMs([]);

    // Assert
    expect(average).toBe(DEFAULT_RUN_MS);
  });

  it('promedia las duraciones medidas', () => {
    // Act
    const average = averageRunMs([30_000, 50_000]);

    // Assert
    expect(average).toBe(40_000);
  });
});

describe('buildQueueInfo', () => {
  it('cuenta solo las pruebas activas que van por delante', () => {
    // Arrange
    const finished = buildJob('done', 2, 2);
    const running = buildJob('running', 1, 2);
    const job = buildJob('queued', 0, 2);
    const later = buildJob('queued', 0, 2);

    // Act
    const info = buildQueueInfo({ job, queue: [finished, running, job, later], avgRunMs: 10_000 });

    // Assert
    expect(info).toEqual({ position: 1, etaMs: 30_000 });
  });

  it('no estima nada para una prueba que ya terminó', () => {
    // Arrange
    const job = buildJob('cancelled', 0, 2);

    // Act
    const info = buildQueueInfo({ job, queue: [job], avgRunMs: 10_000 });

    // Assert
    expect(info).toEqual({ position: 0, etaMs: 0 });
  });
});
