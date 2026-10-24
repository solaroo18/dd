import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessKey, formatRemainingTime } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keyStr = (body.key || req.nextUrl.searchParams.get('key') || '').trim();

    if (!keyStr) {
      return NextResponse.json({ success: false, error: 'Please enter your access key.' }, { status: 400 });
    }

    const { valid, keyInfo, error } = await verifyAccessKey(keyStr, false);
    if (!valid || !keyInfo) {
      return NextResponse.json({ success: false, error: error || 'Invalid access key.' }, { status: 401 });
    }

    const timeInfo = formatRemainingTime(keyInfo.expires_at);

    const response = NextResponse.json({
      success: true,
      message: 'Access key verified successfully! Welcome.',
      key: keyInfo.key,
      label: keyInfo.label,
      expires_at: keyInfo.expires_at,
      time_info: timeInfo,
      remaining_seconds: timeInfo.remaining_seconds,
      remaining_text_ar: timeInfo.text_ar,
      remaining_text_en: timeInfo.text_en,
      is_permanent: timeInfo.is_permanent,
      max_uses: keyInfo.max_uses,
      used_count: keyInfo.used_count || 0,
      status: keyInfo.status,
    });

    response.cookies.set('_nfkey', keyInfo.key, {
      maxAge: 90 * 86400,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
