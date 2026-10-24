import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const history = await getHistory(50);
  return NextResponse.json({ success: true, history });
}
