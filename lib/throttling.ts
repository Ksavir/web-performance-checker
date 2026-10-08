// Ajustes de throttling que recibe Lighthouse para cada red y dispositivo (sin imports de Node: es puro y se prueba aparte).
import type { Device, Network } from './types.ts';

interface ThrottlingSettings {
  rttMs: number;
  throughputKbps: number;
  cpuSlowdownMultiplier: number;
  requestLatencyMs: number;
  downloadThroughputKbps: number;
  uploadThroughputKbps: number;
}

export interface LighthouseThrottling {
  throttlingMethod: 'simulate' | 'provided';
  throttling?: ThrottlingSettings;
}

type ThrottledNetwork = Exclude<Network, 'none'>;

// Mismos valores que los perfiles de Lighthouse (constants.throttling): mobileRegular3G, mobileSlow4G y la red de desktopDense4G.
// requestLatencyMs y los *ThroughputKbps solo se usan con throttling real (devtools); se incluyen para que el perfil sea completo.
const NETWORK_PROFILES: Record<ThrottledNetwork, Omit<ThrottlingSettings, 'cpuSlowdownMultiplier'>> = {
  '3g': { rttMs: 300, throughputKbps: 700, requestLatencyMs: 1125, downloadThroughputKbps: 630, uploadThroughputKbps: 630 },
  slow4g: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
  fast4g: { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
};

// La CPU se ralentiza según el dispositivo, no según la red: un móvil es más lento procesando aunque tenga buena conexión.
const CPU_SLOWDOWN: Record<Device, number> = { mobile: 4, desktop: 1 };

/** Throttling para una ejecución. Sin throttling se mide la carga tal cual ('provided'), también sin ralentizar la CPU. */
export function buildThrottling({ device, network }: { device: Device; network: Network }): LighthouseThrottling {
  if (network === 'none') return { throttlingMethod: 'provided' };
  return {
    throttlingMethod: 'simulate',
    throttling: { ...NETWORK_PROFILES[network], cpuSlowdownMultiplier: CPU_SLOWDOWN[device] },
  };
}
