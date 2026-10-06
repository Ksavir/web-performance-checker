import { describe, it, expect } from 'vitest';
import { compare } from './compare.ts';

const PREVIOUS_META = { id: 1, createdAt: '2026-01-01T00:00:00.000Z' };

describe('compare', () => {
  it('marca el LCP como "worse" cuando sube más de un 5 %', () => {
    // Arrange
    const previous = { ...PREVIOUS_META, lcp: 2000 };
    const current = { lcp: 2200 };

    // Act
    const result = compare(current, previous);

    // Assert
    expect(result?.deltas.lcp).toMatchObject({ status: 'worse', diff: 200 });
  });

  it('marca el score como "better" cuando sube más de 1 punto', () => {
    // Arrange
    const previous = { ...PREVIOUS_META, score: 60 };
    const current = { score: 65 };

    // Act
    const result = compare(current, previous);

    // Assert
    expect(result?.deltas.score).toMatchObject({ status: 'better', previous: 60, current: 65 });
  });

  it('considera "same" un cambio dentro de la tolerancia', () => {
    // Arrange
    const previous = { ...PREVIOUS_META, fcp: 1000 };
    const current = { fcp: 1040 };

    // Act
    const result = compare(current, previous);

    // Assert
    expect(result?.deltas.fcp?.status).toBe('same');
  });

  it('omite las métricas que faltan en alguna de las dos pruebas', () => {
    // Arrange
    const previous = { ...PREVIOUS_META, cls: null, tbt: 100 };
    const current = { cls: 0.2, tbt: 100 };

    // Act
    const result = compare(current, previous);

    // Assert
    expect(result?.deltas).not.toHaveProperty('cls');
    expect(result?.deltas).toHaveProperty('tbt');
  });

  it('incluye el id y la fecha de la prueba anterior', () => {
    // Arrange
    const previous = { ...PREVIOUS_META, lcp: 2000 };

    // Act
    const result = compare({ lcp: 2000 }, previous);

    // Assert
    expect(result).toMatchObject({ previousId: 1, previousDate: PREVIOUS_META.createdAt });
  });

  it('devuelve null si no hay prueba anterior', () => {
    // Arrange
    const current = { lcp: 2200 };

    // Act
    const result = compare(current, null);

    // Assert
    expect(result).toBeNull();
  });
});
