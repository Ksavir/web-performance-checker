// Carga datos de ejemplo (sin Chrome) para ver la interfaz y el PDF.
// Uso: npm run seed
import crypto from 'node:crypto';
import { extract } from '../lib/analyze.js';
import { saveTest } from '../lib/db.js';

const url = 'https://www.demo-casino.example/';

function fakeLhr({ score, lcp, fcp, tbt, cls, apiBase }) {
  const mk = (u, type, transfer, dur, extra = {}) => ({ url: u, resourceType: type, transferSize: transfer, resourceSize: transfer, statusCode: 200, mimeType: extra.mime || '', networkRequestTime: 100, networkEndTime: 100 + dur });
  const items = [
    mk(url, 'Document', 42000, 300, { mime: 'text/html' }),
    mk(url + 'static/app.js', 'Script', 480000, 900),
    mk(url + 'static/vendor.js', 'Script', 320000, 700),
    mk(url + 'static/small.js', 'Script', 30000, 120),
    mk(url + 'img/hero-banner.png', 'Image', 1450000, 1100),
    mk(url + 'img/slot-tile.jpg', 'Image', 310000, 400),
    mk(url + 'img/logo.svg', 'Image', 8000, 90),
    ...[['api/games/list', 1400], ['api/jackpots', 950], ['api/user/session', 620], ['graphql', 540], ['api/promos/active', 480], ['api/geo', 210]]
      .map(([p, d]) => mk(url + p, 'Fetch', 12000, d + apiBase, { mime: 'application/json' })),
  ];
  return {
    categories: { performance: { score: score / 100 } },
    audits: {
      'largest-contentful-paint': { numericValue: lcp }, 'first-contentful-paint': { numericValue: fcp },
      'total-blocking-time': { numericValue: tbt }, 'cumulative-layout-shift': { numericValue: cls },
      'network-requests': { details: { items } },
      'unused-javascript': { details: { overallSavingsBytes: 310000 } },
    },
    runWarnings: [], finalDisplayedUrl: url,
  };
}

const runs = [
  { m: { score: 41, lcp: 5200, fcp: 3100, tbt: 850, cls: 0.21, apiBase: 300 }, d: { score: 72, lcp: 2900, fcp: 1400, tbt: 260, cls: 0.08, apiBase: 200 } },
  { m: { score: 53, lcp: 4300, fcp: 2600, tbt: 640, cls: 0.12, apiBase: 100 }, d: { score: 81, lcp: 2300, fcp: 1200, tbt: 180, cls: 0.05, apiBase: 0 } },
];
for (const r of runs) {
  const batchId = crypto.randomUUID();
  for (const [device, l] of [['mobile', r.m], ['desktop', r.d]]) {
    saveTest({ batchId, url, pageType: 'homepage', device, runs: 1, result: extract(fakeLhr(l), url) });
  }
  await new Promise((res) => setTimeout(res, 1100)); // fechas distintas
}
console.log('Demo data loaded. Start the app with: npm run dev');
