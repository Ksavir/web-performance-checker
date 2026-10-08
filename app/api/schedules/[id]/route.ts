import { NextResponse } from 'next/server';
import { getScheduleStore } from '@/lib/schedulerRuntime';
import { applyPatch } from '@/lib/schedule';
import { badRequest, type IdContext } from '../../errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: IdContext) {
  const { id } = await params;
  const store = getScheduleStore();
  const schedule = store.getSchedule(id);
  if (!schedule) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
  try {
    const updated = applyPatch(schedule, await req.json(), Date.now());
    store.saveSchedule(updated);
    return NextResponse.json({ schedule: updated });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_req: Request, { params }: IdContext) {
  const { id } = await params;
  if (!getScheduleStore().deleteSchedule(id)) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
