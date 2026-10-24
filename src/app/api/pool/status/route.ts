import { NextResponse } from 'next/server';
import { getCookiePool } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pool = await getCookiePool();
  const activeCount = pool.filter((c) => c.status === 'active').length;
  const vipCount = pool.filter((c) => c.status === 'active' && c.pool_type === 'vip').length;
  const standardCount = pool.filter((c) => c.status === 'active' && c.pool_type !== 'vip').length;

  return NextResponse.json({
    success: true,
    active_cookies: activeCount,
    total_cookies: pool.length,
    vip_cookies: vipCount,
    standard_cookies: standardCount,
  });
}
