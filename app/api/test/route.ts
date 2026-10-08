import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validate';
import { enqueue } from '@/lib/queue';
import { badRequest } from '../errors';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const params = validateRequest(await req.json());
    const job = enqueue(params);
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    return badRequest(error);
  }
}
