import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { deleteAccessKey } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keyStr = body.key;

  if (!keyStr) {
    return NextResponse.json({ success: false, error: 'Key is required.' }, { status: 400 });
  }

  await deleteAccessKey(keyStr);
  return NextResponse.json({ success: true, message: 'Key deleted successfully.' });
}
