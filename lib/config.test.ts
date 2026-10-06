import { describe, it, expect } from 'vitest';
import { rate } from './config.ts';

describe('rate', () => {
  it.each([
    [2500, 'good'],
    [3000, 'ok'],
    [4001, 'poor'],
  ])('califica un LCP de %i ms como "%s"', (value, expected) => {
    // Act
    const rating = rate('lcp', value);

    // Assert
    expect(rating).toBe(expected);
  });

  it.each([
    [90, 'good'],
    [50, 'ok'],
    [49, 'poor'],
  ])('califica un score de %i como "%s" (más alto es mejor)', (value, expected) => {
    // Act
    const rating = rate('score', value);

    // Assert
    expect(rating).toBe(expected);
  });

  it('devuelve "none" cuando falta el valor', () => {
    // Act
    const rating = rate('cls', null);

    // Assert
    expect(rating).toBe('none');
  });

  it('devuelve "none" para una métrica sin umbrales', () => {
    // Act
    const rating = rate('pageSize', 1000);

    // Assert
    expect(rating).toBe('none');
  });
});
