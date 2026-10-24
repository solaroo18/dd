import { NextRequest, NextResponse } from 'next/server';
import { extractCookieDict, fetchNftokenApi, buildTokenPayload, REQUIRED_COOKIE } from '@/lib/netflix';
import { verifyAdminTokenFromHeaderOrCookie, extractAccessKeyFromRequest, verifyAccessKey } from '@/lib/auth';
import { getAppSettings, saveHistory } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = verifyAdminTokenFromHeaderOrCookie(req);
    const settings = await getAppSettings();

    if (!isAdmin && settings.require_key) {
      const reqKey = extractAccessKeyFromRequest(req);
      const { valid, error } = await verifyAccessKey(reqKey, true);
      if (!valid) {
        return NextResponse.json({ success: false, key_required: true, error }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const rawCookie = body.cookie || body.raw || '';

    if (!rawCookie || typeof rawCookie !== 'string') {
      return NextResponse.json({ success: false, error: 'Please provide valid cookie data.' }, { status: 400 });
    }

    const cookieDict = extractCookieDict(rawCookie);
    if (!cookieDict || !cookieDict[REQUIRED_COOKIE]) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid NetflixId found in provided cookies. (لم يتم العثور على NetflixId صالح)',
        },
        { status: 400 }
      );
    }

    const { token, expires, error } = await fetchNftokenApi(cookieDict);
    if (error || !token) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const payload = await buildTokenPayload(token, expires, 'Manual Cookie');

    await saveHistory({
      token_preview: token.length > 18 ? token.slice(0, 18) + '...' : token,
      full_token: token,
      login_url: payload.login_url,
      tv_activation_url: payload.tv_activation_url,
      expires_formatted: payload.expires_formatted,
      account_name: 'Manual Cookie',
      created_at: payload.created_at,
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
