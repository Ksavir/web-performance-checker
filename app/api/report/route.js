import { NextResponse } from 'next/server';
import { buildPdf } from '@/lib/pdf';

export const runtime = 'nodejs';

// El historial vive en el navegador, así que el cliente envía los resultados y recibe el PDF.
export async function POST(req) {
  let tests;
  try { tests = (await req.json()).results; } catch { tests = null; }
  const valid = Array.isArray(tests) && tests.length > 0 && tests.length <= 2
    && tests.every((t) => t && typeof t.url === 'string' && t.findings && Array.isArray(t.warnings) && typeof t.createdAt === 'string');
  if (!valid) return NextResponse.json({ error: 'Invalid report data.' }, { status: 400 });
  const pdf = await buildPdf(tests);
  const host = (() => { try { return new URL(tests[0].url).hostname; } catch { return 'report'; } })();
  const stamp = tests[0].createdAt.slice(0, 10);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="perf-${host}-${tests[0].pageType}-${stamp}.pdf"`,
    },
  });
}
