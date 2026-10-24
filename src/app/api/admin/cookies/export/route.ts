import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const pool = await getCookiePool();
  return NextResponse.json(pool);
}
