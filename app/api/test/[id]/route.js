import { NextResponse } from 'next/server';
import { cancelJob, getJob, getQueueInfo } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job not found (the server may have restarted).' }, { status: 404 });
  const { status, progress, errors, url, pageType, results } = job;
  const { position, etaMs } = getQueueInfo(job);
  return NextResponse.json({ status, progress, errors, url, pageType, position, etaMs, results: status === 'done' ? results : [] });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  if (!getJob(id)) return NextResponse.json({ error: 'Job not found (the server may have restarted).' }, { status: 404 });
  if (!cancelJob(id)) return NextResponse.json({ error: 'The test has already finished.' }, { status: 409 });
  return NextResponse.json({ cancelled: true });
}
