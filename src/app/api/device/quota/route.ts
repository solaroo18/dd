import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie, extractAccessKeyFromRequest, verifyAccessKey, formatRemainingTime } from '@/lib/auth';
import { getAppSettings } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminTokenFromHeaderOrCookie(req);
  const reqKey = extractAccessKeyFromRequest(req);
  const settings = await getAppSettings();

  const { valid: hasValidKey, keyInfo } = await verifyAccessKey(reqKey, false);
  const timeInfo = hasValidKey && keyInfo ? formatRemainingTime(keyInfo.expires_at) : null;

  return NextResponse.json({
    success: true,
    device_id: 'unlimited',
    today: new Date().toISOString().substring(0, 10),
    limit: 'unlimited',
    used: 0,
    remaining: 'unlimited',
    can_activate: true,
    is_admin: isAdmin,
    key_required: settings.require_key,
    has_valid_key: hasValidKey,
    key_label: keyInfo?.label || '',
    key_time_info: timeInfo,
  });
}
