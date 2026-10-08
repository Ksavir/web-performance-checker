import { describe, it, expect } from 'vitest';
import { buildThrottling } from './throttling.ts';

describe('buildThrottling', () => {
  it('simula Slow 4G con la CPU 4 veces más lenta en mobile (perfil por defecto de Lighthouse)', () => {
    // Act
    const settings = buildThrottling({ device: 'mobile', network: 'slow4g' });

    // Assert
    expect(settings).toMatchObject({ throttlingMethod: 'simulate', throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 } });
  });

  it('no ralentiza la CPU en desktop aunque la red sea lenta', () => {
    // Act
    const settings = buildThrottling({ device: 'desktop', network: '3g' });

    // Assert
    expect(settings.throttling).toMatchObject({ rttMs: 300, throughputKbps: 700, cpuSlowdownMultiplier: 1 });
  });

  it('usa la red de Fast 4G (40 ms, 10 Mbps)', () => {
    // Act
    const settings = buildThrottling({ device: 'mobile', network: 'fast4g' });

    // Assert
    expect(settings.throttling).toMatchObject({ rttMs: 40, throughputKbps: 10240 });
  });

  it('mide la carga tal cual cuando no hay throttling', () => {
    // Act
    const settings = buildThrottling({ device: 'mobile', network: 'none' });

    // Assert
    expect(settings).toEqual({ throttlingMethod: 'provided' });
  });
});
