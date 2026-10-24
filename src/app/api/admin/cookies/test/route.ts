import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool, updateCookie } from '@/lib/db-service';
import { extractCookieDict, fetchNftokenApi, REQUIRED_COOKIE, formatExpiry } from '@/lib/netflix';

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
    await updateCookie(id, { status: 'invalid', last_status: 'Missing NetflixId' });
    return NextResponse.json({
      success: false,
      working: false,
      error: 'Cookie is missing NetflixId.',
    });
  }

  const { token, expires, error } = await fetchNftokenApi(cookieDict);
  if (error || !token) {
    const isExpired =
      error?.toLowerCase().includes('expired') ||
      error?.toLowerCase().includes('no token found') ||
      error?.toLowerCase().includes('401');
    const newStatus = isExpired ? 'expired' : 'invalid';
    await updateCookie(id, { status: newStatus, last_status: error || 'Failed' });

    return NextResponse.json({
      success: false,
      working: false,
      error: error || 'Could not fetch token',
      status: newStatus,
    });
  }

  await updateCookie(id, {
    status: 'active',
    last_status: 'Working',
    last_used: new Date().toISOString().replace('T', ' ').substring(0, 19),
  });

  return NextResponse.json({
    success: true,
    working: true,
    token_preview: token.slice(0, 15) + '...',
    expires_formatted: formatExpiry(expires),
    status: 'active',
  });
}
