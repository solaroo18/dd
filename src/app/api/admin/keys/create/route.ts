import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { saveAccessKey, getAccessKey } from '@/lib/db-service';
import { AccessKeyItem } from '@/lib/types';

function generateRandomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `NF-${seg(4)}-${seg(4)}-${seg(4)}`;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  let key = (body.key || '').trim().toUpperCase();
  const label = (body.label || '').trim() || 'User Access Key';
  const type = body.type === 'vip' ? 'vip' : 'standard';
  const durationHours = parseInt(body.duration_hours || body.duration || '0', 10);
  const maxUses = body.max_uses ? parseInt(body.max_uses, 10) : null;

  if (!key) {
    key = generateRandomKey();
  }

  const existing = await getAccessKey(key);
  if (existing) {
    return NextResponse.json({ success: false, error: 'Key already exists.' }, { status: 400 });
  }

  let expiresAt: string | null = null;
  if (durationHours > 0) {
    const expDate = new Date(Date.now() + durationHours * 3600 * 1000);
    expiresAt = expDate.toISOString().replace('T', ' ').substring(0, 19);
  }

  const newKeyItem: AccessKeyItem = {
    key,
    label,
    type,
    status: 'active',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    expires_at: expiresAt,
    max_uses: maxUses,
    used_count: 0,
    devices: [],
    last_used_at: null,
  };

  await saveAccessKey(newKeyItem);
  return NextResponse.json({ success: true, message: 'Key created successfully.', key: newKeyItem });
}
