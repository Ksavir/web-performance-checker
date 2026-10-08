import { NextResponse } from 'next/server';
import { createSchedule, getScheduleStore, startScheduler } from '@/lib/schedulerRuntime';
import { attachComparisons } from '@/lib/schedule';
import { isActiveJob } from '@/lib/estimate';
import { getJob } from '@/lib/queue';
import type { Schedule, ScheduledRun } from '@/lib/types';
import { badRequest } from '../errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resumen de la última corrida: lo que la lista de programaciones muestra sin pedir el detalle. */
function summarizeLastRun(runs: ScheduledRun[]) {
  const [last] = attachComparisons(runs);
  if (!last) return null;
  return { id: last.id, startedAt: last.startedAt, status: last.status, scores: Object.fromEntries(last.results.map((row) => [row.device, row.score])) };
}

/** Una corrida sigue en la cola. El id guardado puede ser de antes de un reinicio, por eso se comprueba contra la cola. */
function isRunning(schedule: Schedule) {
  const job = schedule.activeJobId ? getJob(schedule.activeJobId) : null;
  return job !== null && isActiveJob(job);
}

export async function GET() {
  startScheduler();
  const store = getScheduleStore();
  const schedules = store.listSchedules().map((schedule) => ({ ...schedule, running: isRunning(schedule), lastRun: summarizeLastRun(store.listRuns(schedule.id)) }));
  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  try {
    const schedule = createSchedule(await req.json());
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return badRequest(error);
  }
}
