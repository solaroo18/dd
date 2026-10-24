import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const cookies = await getCookiePool();
  return NextResponse.json({
    success: true,
    cookies,
    total: cookies.length,
    active: cookies.filter((c) => c.status === 'active').length,
    vip: cookies.filter((c) => c.pool_type === 'vip').length,
  });
}
