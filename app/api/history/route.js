import { NextResponse } from 'next/server';
import { listBatches } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ batches: listBatches(30) });
}
