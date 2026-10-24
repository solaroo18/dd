import { NextRequest, NextResponse } from 'next/server';
import { generateQrBase64 } from '@/lib/netflix';
import { verifyAdminTokenFromHeaderOrCookie, extractAccessKeyFromRequest, verifyAccessKey } from '@/lib/auth';
import { getAppSettings } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = verifyAdminTokenFromHeaderOrCookie(req);
    const settings = await getAppSettings();

    const body = await req.json().catch(() => ({}));
    const tvCode = (body.code || '').trim().replace(/[-\s]/g, '').toUpperCase();
    const token = (body.token || '').trim();

    if (!isAdmin && settings.require_key) {
      const reqKey = extractAccessKeyFromRequest(req);
      const { valid, error } = await verifyAccessKey(reqKey, token === '');
      if (!valid) {
        return NextResponse.json({ success: false, key_required: true, error }, { status: 401 });
      }
    }

    if (!tvCode || !/^[A-Z0-9]{8}$/.test(tvCode)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 8-character alphanumeric activation code.' },
        { status: 400 }
      );
    }

    const formattedCode = `${tvCode.slice(0, 4)}-${tvCode.slice(4)}`;
    let autoActivateUrl = 'https://www.netflix.com/tv8';
    if (token) {
      autoActivateUrl = `https://www.netflix.com/tv8?nftoken=${encodeURIComponent(token)}`;
    }

    const tvQr = await generateQrBase64(autoActivateUrl);

    return NextResponse.json({
      success: true,
      code: formattedCode,
      auto_activate_url: autoActivateUrl,
      direct_tv_link: 'https://www.netflix.com/tv8',
      tv_qr: tvQr,
      message: 'Open the activation link to sign in automatically and enter your TV screen code directly.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
