import { NextRequest, NextResponse } from 'next/server';
import { extractAccessKeyFromRequest, verifyAccessKey, formatRemainingTime } from '@/lib/auth';
import { getAppSettings } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  const settings = await getAppSettings();
  const keyStr = extractAccessKeyFromRequest(req);

  if (!settings.require_key) {
    return NextResponse.json({
      success: true,
      required: false,
      has_valid_key: true,
      key_info: { key: keyStr || 'none', label: 'No Key Required' },
    });
  }

  const { valid, keyInfo, error } = await verifyAccessKey(keyStr, false);
  const timeInfo = valid && keyInfo ? formatRemainingTime(keyInfo.expires_at) : null;

  return NextResponse.json({
    success: true,
    required: true,
    has_valid_key: valid,
    error: !valid ? error : null,
    key_info:
      valid && keyInfo
        ? {
            key: keyInfo.key,
            label: keyInfo.label,
            expires_at: keyInfo.expires_at,
            time_info: timeInfo,
            remaining_seconds: timeInfo?.remaining_seconds,
            remaining_text_ar: timeInfo?.text_ar,
            remaining_text_en: timeInfo?.text_en,
            is_permanent: timeInfo?.is_permanent,
            max_uses: keyInfo.max_uses,
            used_count: keyInfo.used_count || 0,
            status: keyInfo.status,
          }
        : null,
  });
}
