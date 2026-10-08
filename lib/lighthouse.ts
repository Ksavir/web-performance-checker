import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { extract } from './analyze.ts';
import { buildThrottling } from './throttling.ts';
import type { Device, Lhr, Network, TestResult } from './types.ts';

const RUN_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_WAIT_FOR_LOAD_MS = 45_000;

interface RunParams {
  url: string;
  device: Device;
  network: Network;
  signal?: AbortSignal;
}

/**
 * Ejecuta Lighthouse una vez (mobile o desktop, con la red elegida) y devuelve el resultado normalizado.
 * Requiere Chrome/Chromium instalado (o CHROME_PATH apuntando al ejecutable).
 */
export async function runLighthouse({ url, device, network, signal }: RunParams): Promise<TestResult> {
  signal?.throwIfAborted();
  let chrome: chromeLauncher.LaunchedChrome;
  try {
    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  } catch {
    throw new Error('Could not start Chrome. Install Google Chrome or Chromium, or set the CHROME_PATH environment variable to its executable.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const flags = {
      port: chrome.port,
      output: 'json' as const,
      logLevel: 'error' as const,
      onlyCategories: ['performance'],
      maxWaitForLoad: MAX_WAIT_FOR_LOAD_MS,
      // Los flags tienen prioridad sobre la configuración: la red elegida reemplaza la del perfil del dispositivo.
      ...buildThrottling({ device, network }),
    };
    // La configuración solo aporta la emulación del dispositivo (pantalla y user agent); móvil = valores por defecto.
    const config = device === 'desktop' ? desktopConfig : undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Lighthouse timed out after 3 minutes.')), RUN_TIMEOUT_MS);
    });
    // Al cancelar se cierra Chrome y se rechaza de inmediato (Lighthouse falla por su cuenta después).
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => { try { chrome.kill(); } catch { /* Chrome ya estaba cerrado */ } reject(signal?.reason); };
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
    });
    const result = await Promise.race([lighthouse(url, flags, config), timeout, aborted]);
    if (!result?.lhr) throw new Error('Lighthouse returned no report.');
    // El informe es JSON externo: Lhr describe solo lo que la app lee, y analyze.ts valida cada campo al leerlo.
    return extract(result.lhr as unknown as Lhr, url);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
    try { await chrome.kill(); } catch { /* Chrome ya estaba cerrado */ }
  }
}
