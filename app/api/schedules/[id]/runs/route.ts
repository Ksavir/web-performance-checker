import { NextResponse } from 'next/server';
import type { IdContext } from '../../../errors';
import { getScheduleStore } from '@/lib/schedulerRuntime';
import { attachComparisons } from '@/lib/schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: IdContext) {
  const { id } = await params;
  const store = getScheduleStore();
  if (!store.getSchedule(id)) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
  return NextResponse.json({ runs: attachComparisons(store.listRuns(id)) });
}
