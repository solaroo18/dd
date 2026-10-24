import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { deleteCookie } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id || body.cookie_id;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Cookie ID is required.' }, { status: 400 });
  }

  await deleteCookie(id);
  return NextResponse.json({ success: true, message: 'Cookie deleted successfully.' });
}
