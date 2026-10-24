import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { getCookiePool, updateCookie } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id || body.cookie_id;
  const poolType = body.pool_type || body.type;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Cookie ID is required.' }, { status: 400 });
  }

  const pool = await getCookiePool();
  const item = pool.find((c) => c.id === id);
  if (!item) {
    return NextResponse.json({ success: false, error: 'Cookie not found.' }, { status: 404 });
  }

  const targetType = poolType || (item.pool_type === 'vip' ? 'paid' : 'vip');
  await updateCookie(id, { pool_type: targetType });

  return NextResponse.json({
    success: true,
    message: `Cookie moved to ${targetType} pool.`,
    pool_type: targetType,
  });
}
