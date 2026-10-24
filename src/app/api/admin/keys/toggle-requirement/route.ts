import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getAppSettings, updateAppSettings } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const settings = await getAppSettings();
  const newSetting = !settings.require_key;
  await updateAppSettings({ require_key: newSetting });

  return NextResponse.json({
    success: true,
    require_key: newSetting,
    message: newSetting ? 'Access keys are now required.' : 'Access keys are now optional (public mode).',
  });
}
