import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { addCookieToPool } from '@/lib/db-service';
import { extractCookieDict, detectCookieFormat, REQUIRED_COOKIE } from '@/lib/netflix';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = (body.raw || body.cookie || '').trim();
  const name = (body.name || '').trim() || `Account ${Date.now().toString().slice(-4)}`;
  const poolType = body.pool_type === 'vip' ? 'vip' : 'paid';

  if (!raw) {
    return NextResponse.json({ success: false, error: 'Cookie content cannot be empty.' }, { status: 400 });
  }

  const cookieDict = extractCookieDict(raw);
  if (!cookieDict[REQUIRED_COOKIE]) {
    return NextResponse.json(
      { success: false, error: 'Could not find required NetflixId cookie.' },
      { status: 400 }
    );
  }

  const format = detectCookieFormat(raw);
  const netflixIdVal = cookieDict[REQUIRED_COOKIE];
  const preview = netflixIdVal.length > 20 ? netflixIdVal.slice(0, 15) + '...' : netflixIdVal;

  const item = await addCookieToPool({
    name,
    raw,
    netflix_id_preview: preview,
    format,
    status: 'active',
    pool_type: poolType,
  });

  return NextResponse.json({ success: true, message: 'Cookie added successfully.', cookie: item });
}
