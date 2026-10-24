import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool, updateCookie } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id || body.cookie_id;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Cookie ID is required.' }, { status: 400 });
  }

  const pool = await getCookiePool();
  const item = pool.find((c) => c.id === id);
  if (!item) {
    return NextResponse.json({ success: false, error: 'Cookie not found.' }, { status: 404 });
  }

  const newStatus = item.status === 'active' ? 'disabled' : 'active';
  await updateCookie(id, { status: newStatus });

  return NextResponse.json({
    success: true,
    message: `Cookie is now ${newStatus}.`,
    status: newStatus,
  });
}
