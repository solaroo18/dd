import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool } from '@/lib/db-service';
import { extractCookieDict, fetchNftokenApi, buildTokenPayload, REQUIRED_COOKIE } from '@/lib/netflix';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id || body.cookie_id;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Cookie ID is required.' }, { status: 400 });
  }

  const pool = await getCookiePool();
  const item = pool.find((c) => c.id === id);
  if (!item) {
    return NextResponse.json({ success: false, error: 'Cookie not found.' }, { status: 404 });
  }

  const cookieDict = extractCookieDict(item.raw);
  if (!cookieDict[REQUIRED_COOKIE]) {
    return NextResponse.json({ success: false, error: 'Missing NetflixId.' }, { status: 400 });
  }

  const { token, expires, error } = await fetchNftokenApi(cookieDict);
  if (error || !token) {
    return NextResponse.json({ success: false, error: error || 'Failed to generate token' }, { status: 400 });
  }

  const payload = await buildTokenPayload(token, expires, item.name);
  return NextResponse.json(payload);
}
