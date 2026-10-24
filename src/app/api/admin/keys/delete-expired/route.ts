import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { deleteExpiredAccessKeys } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const deletedCount = await deleteExpiredAccessKeys();
  return NextResponse.json({
    success: true,
    deleted: deletedCount,
    message: `Deleted ${deletedCount} expired keys.`,
  });
}
