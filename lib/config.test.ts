import { describe, it, expect } from 'vitest';
import { rate, resolveNetwork } from './config.ts';

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

describe('resolveNetwork', () => {
  it('usa la red guardada en la prueba', () => {
    // Act
    const network = resolveNetwork({ device: 'desktop', network: '3g' });

    // Assert
    expect(network).toBe('3g');
  });

  it.each([
    ['mobile', 'slow4g'],
    ['desktop', 'fast4g'],
  ] as const)('asume el perfil por defecto de Lighthouse para pruebas antiguas en %s (%s)', (device, expected) => {
    // Act
    const network = resolveNetwork({ device });

    // Assert
    expect(network).toBe(expected);
  });
});
