import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool, updateCookie } from '@/lib/db-service';
import { extractCookieDict, fetchNftokenApi, REQUIRED_COOKIE } from '@/lib/netflix';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const pool = await getCookiePool();
  let workingCount = 0;
  let expiredCount = 0;
  let invalidCount = 0;

  for (const c of pool) {
    const cookieDict = extractCookieDict(c.raw);
    if (!cookieDict[REQUIRED_COOKIE]) {
      await updateCookie(c.id, { status: 'invalid', last_status: 'Missing NetflixId' });
      invalidCount++;
      continue;
    }

    const { token, error } = await fetchNftokenApi(cookieDict);
    if (token) {
      await updateCookie(c.id, { status: 'active', last_status: 'Working' });
      workingCount++;
    } else {
      const isExpired =
        error?.toLowerCase().includes('expired') ||
        error?.toLowerCase().includes('no token found') ||
        error?.toLowerCase().includes('401');
      const st = isExpired ? 'expired' : 'invalid';
      await updateCookie(c.id, { status: st, last_status: error || 'Failed' });
      if (isExpired) expiredCount++;
      else invalidCount++;
    }
  }

  return NextResponse.json({
    success: true,
    total: pool.length,
    working: workingCount,
    expired: expiredCount,
    invalid: invalidCount,
  });
}
