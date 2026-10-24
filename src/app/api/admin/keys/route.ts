import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie, formatRemainingTime } from '@/lib/auth';
import { getAllAccessKeys, getAppSettings } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const keys = await getAllAccessKeys();
  const settings = await getAppSettings();

  const formattedKeys = keys.map((k) => ({
    ...k,
    time_info: formatRemainingTime(k.expires_at),
  }));

  return NextResponse.json({
    success: true,
    keys: formattedKeys,
    require_key: settings.require_key,
    total_keys: keys.length,
    active_keys: keys.filter((k) => k.status === 'active').length,
  });
}
