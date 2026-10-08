import { NextResponse } from 'next/server';
import { buildPdf } from '@/lib/pdf';

type ReportTests = Parameters<typeof buildPdf>[0];

export const runtime = 'nodejs';

// El historial vive en el navegador, así que el cliente envía los resultados y recibe el PDF.
export async function POST(req: Request) {
  let tests: ReportTests | null;
  try { tests = (await req.json()).results; } catch { tests = null; }
  const valid = Array.isArray(tests) && tests.length > 0 && tests.length <= 2
    && tests.every((test) => test && typeof test.url === 'string' && test.findings && Array.isArray(test.warnings) && typeof test.createdAt === 'string');
  if (!valid || !tests) return NextResponse.json({ error: 'Invalid report data.' }, { status: 400 });
  const pdf = await buildPdf(tests);
  const host = (() => { try { return new URL(tests[0].url).hostname; } catch { return 'report'; } })();
  const stamp = tests[0].createdAt.slice(0, 10);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="perf-${host}-${tests[0].pageType}-${stamp}.pdf"`,
    },
  });
}
