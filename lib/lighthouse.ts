import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { extract } from './analyze.ts';
import type { Device, TestResult } from './types.ts';

const RUN_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Ejecuta Lighthouse una vez (mobile o desktop) y devuelve el resultado normalizado.
 * Requiere Chrome/Chromium instalado (o CHROME_PATH apuntando al ejecutable).
 */
export async function runLighthouse(url: string, device: Device): Promise<TestResult> {
  let chrome: chromeLauncher.LaunchedChrome;
  try {
    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    throw new Error('Could not start Chrome. Install Google Chrome or Chromium, or set the CHROME_PATH environment variable to its executable.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const flags = {
      port: chrome.port,
      output: 'json' as const,
      logLevel: 'error' as const,
      onlyCategories: ['performance'],
      maxWaitForLoad: 45000,
    };
    const config = device === 'desktop' ? desktopConfig : undefined; // móvil = valores por defecto de Lighthouse

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Lighthouse timed out after 3 minutes.')), RUN_TIMEOUT_MS);
    });
    const result = await Promise.race([lighthouse(url, flags, config), timeout]);
    if (!result?.lhr) throw new Error('Lighthouse returned no report.');
    return extract(result.lhr, url);
  } finally {
    clearTimeout(timer);
    try { await chrome.kill(); } catch { /* ignore */ }
  }
}
