import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getAccessKey, saveAccessKey } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keyStr = body.key;

  if (!keyStr) {
    return NextResponse.json({ success: false, error: 'Key is required.' }, { status: 400 });
  }

  const item = await getAccessKey(keyStr);
  if (!item) {
    return NextResponse.json({ success: false, error: 'Key not found.' }, { status: 404 });
  }

  item.status = item.status === 'active' ? 'disabled' : 'active';
  await saveAccessKey(item);

  return NextResponse.json({
    success: true,
    message: `Key is now ${item.status}.`,
    status: item.status,
  });
}
