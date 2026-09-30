import { NextResponse } from 'next/server';
import { getBatch, getPrevious } from '@/lib/db';
import { compare } from '@/lib/compare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const tests = getBatch(id);
  if (!tests.length) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
  return NextResponse.json({
    batchId: id,
    results: tests.map((t) => ({ ...t, comparison: compare(t, getPrevious(t)) })),
  });
}
