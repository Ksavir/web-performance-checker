import { DEFAULT_NETWORK, DEVICES, NETWORKS, PAGE_TYPES } from './config.ts';
import type { Device, Network, PageType } from './types.ts';

const ALLOWED_RUNS = [1, 3];

export interface TestRequest {
  url: string;
  pageType: PageType;
  devices: Device[];
  runs: number;
  network: Network;
}

export function normalizeUrl(input: unknown): string {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Enter a URL.');
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('That URL is not valid.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https URLs are supported.');
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') throw new Error('That URL is not valid.');
  url.hash = '';
  return url.href;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Valida el cuerpo de POST /api/test. Los dispositivos se devuelven en el orden de DEVICES. */
export function validateRequest(body: unknown): TestRequest {
  const input = isRecord(body) ? body : {};
  const url = normalizeUrl(input.url);
  const pageType = PAGE_TYPES.find((p) => p.id === input.pageType)?.id;
  if (!pageType) throw new Error('Choose a page type.');
  const requested = Array.isArray(input.devices) ? input.devices : [];
  const devices = DEVICES.map((entry) => entry.id).filter((device) => requested.includes(device));
  if (!devices.length) throw new Error('Choose at least one device.');
  const runs = ALLOWED_RUNS.includes(Number(input.runs)) ? Number(input.runs) : 1;
  const network = input.network == null ? DEFAULT_NETWORK : NETWORKS.find((n) => n.id === input.network)?.id;
  if (!network) throw new Error('Choose a network profile.');
  return { url, pageType, devices, runs, network };
}
