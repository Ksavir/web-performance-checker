import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validate';
import { enqueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const params = validateRequest(await req.json());
    const job = enqueue(params);
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
