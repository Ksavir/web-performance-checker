import { NextResponse } from 'next/server';
import { getJob } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job not found (the server may have restarted).' }, { status: 404 });
  const { status, progress, errors, url, pageType, results } = job;
  return NextResponse.json({ status, progress, errors, url, pageType, results: status === 'done' ? results : [] });
}
