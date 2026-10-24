import { NextRequest, NextResponse } from 'next/server';
import {
  extractAccessKeyFromRequest,
  verifyAccessKey,
  verifyAdminTokenFromHeaderOrCookie,
} from '@/lib/auth';
import {
  getAppSettings,
  getCookiePool,
  updateCookie,
  saveHistory,
} from '@/lib/db-service';
import {
  extractCookieDict,
  fetchNftokenApi,
  buildTokenPayload,
  REQUIRED_COOKIE,
} from '@/lib/netflix';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = verifyAdminTokenFromHeaderOrCookie(req);
    const body = await req.json().catch(() => ({}));
    const isManualRotate = Boolean(
      body.manual_rotate || body.refresh || req.headers.get('X-Manual-Rotate') === '1'
    );

    const settings = await getAppSettings();

    // Check Private Access Key Gate
    if (!isAdmin && settings.require_key) {
      const reqKey = extractAccessKeyFromRequest(req);
      const { valid, keyInfo, error } = await verifyAccessKey(reqKey, isManualRotate);
      if (!valid) {
        return NextResponse.json(
          {
            success: false,
            key_required: true,
            error: error || 'Access key is required or invalid.',
          },
          { status: 401 }
        );
      }
    }

    const pool = await getCookiePool();
    const activeCookies = pool.filter((c) => c.status === 'active');

    if (activeCookies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active accounts in the pool currently. Please notify the administrator.',
          details: 'Cookie pool is empty or all accounts are inactive',
          daily_quota: { limit: 3, used: 0, remaining: 3 },
        },
        { status: 400 }
      );
    }

    // Try candidates in pool
    let tokenPayload = null;
    let lastError: string | null = null;

    // Shuffle slightly or pick least recently used
    const sortedCandidates = [...activeCookies].sort(
      (a, b) => (a.usage_count || 0) - (b.usage_count || 0)
    );

    for (const candidate of sortedCandidates) {
      const cookieDict = extractCookieDict(candidate.raw);
      if (!cookieDict || !cookieDict[REQUIRED_COOKIE]) {
        await updateCookie(candidate.id, { status: 'invalid' });
        continue;
      }

      const { token, expires, error } = await fetchNftokenApi(cookieDict);
      if (error || !token) {
        lastError = error;
        if (
          error &&
          (error.toLowerCase().includes('expired') ||
            error.toLowerCase().includes('no token found') ||
            error.toLowerCase().includes('401') ||
            error.toLowerCase().includes('403'))
        ) {
          await updateCookie(candidate.id, { status: 'expired' });
        }
        continue;
      }

      // Successful token!
      await updateCookie(candidate.id, {
        usage_count: (candidate.usage_count || 0) + 1,
        last_used: new Date().toISOString().replace('T', ' ').substring(0, 19),
        last_status: 'active',
      });

      tokenPayload = await buildTokenPayload(token, expires, candidate.name || 'Pool Account');

      await saveHistory({
        token_preview: token.length > 18 ? token.slice(0, 18) + '...' : token,
        full_token: token,
        login_url: tokenPayload.login_url,
        tv_activation_url: tokenPayload.tv_activation_url,
        expires_formatted: tokenPayload.expires_formatted,
        account_name: candidate.name || 'Pool Cookie',
        created_at: tokenPayload.created_at,
      });

      break;
    }

    if (!tokenPayload) {
      return NextResponse.json(
        {
          success: false,
          error:
            lastError ||
            'Could not generate link from any active account in pool. Please check accounts.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...tokenPayload,
      daily_quota: {
        limit: 3,
        used: 0,
        remaining: 3,
      },
      device_quota: {
        limit: 'unlimited',
        used: 0,
        remaining: 'unlimited',
      },
    });
  } catch (err: any) {
    console.error('generate-from-pool error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
