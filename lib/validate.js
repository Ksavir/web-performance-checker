import { PAGE_TYPES } from './config.js';

export function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Enter a URL.');
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch { throw new Error('That URL is not valid.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https URLs are supported.');
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') throw new Error('That URL is not valid.');
  u.hash = '';
  return u.href;
}

export function validateRequest(body) {
  const url = normalizeUrl(body?.url);
  const pageType = PAGE_TYPES.some((p) => p.id === body?.pageType) ? body.pageType : null;
  if (!pageType) throw new Error('Choose a page type.');
  const devices = ['mobile', 'desktop'].filter((d) => (body?.devices || []).includes(d));
  if (!devices.length) throw new Error('Choose at least one device.');
  const runs = [1, 3].includes(Number(body?.runs)) ? Number(body.runs) : 1;
  return { url, pageType, devices, runs };
}
