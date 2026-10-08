import { NextResponse } from 'next/server';
import type { IdContext } from '../../../errors';
import { getScheduleStore, runScheduleNow } from '@/lib/schedulerRuntime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: IdContext) {
  const { id } = await params;
  const schedule = getScheduleStore().getSchedule(id);
  if (!schedule) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
  if (!runScheduleNow(schedule)) return NextResponse.json({ error: 'The previous run is still in the queue.' }, { status: 409 });
  return NextResponse.json({ started: true }, { status: 202 });
}
