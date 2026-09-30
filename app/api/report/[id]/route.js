import { NextResponse } from 'next/server';
import { getBatch } from '@/lib/db';
import { buildPdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const tests = getBatch(id);
  if (!tests.length) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
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
