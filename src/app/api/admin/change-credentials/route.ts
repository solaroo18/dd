import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { updateAppSettings, verifyAdminCredentials } from '@/lib/db-service';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = (body.current_password || '').trim();
  const newUsername = (body.new_username || '').trim();
  const newPassword = (body.new_password || '').trim();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { success: false, error: 'New password must be at least 6 characters.' },
      { status: 400 }
    );
  }

  const updates: any = {};
  if (newUsername) updates.admin_username = newUsername;
  updates.admin_password_hash = bcrypt.hashSync(newPassword, 10);

  await updateAppSettings(updates);

  return NextResponse.json({
    success: true,
    message: 'Admin credentials updated successfully.',
  });
}
