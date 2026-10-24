import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getAccessKey, saveAccessKey, getAppSettings } from './db-service';
import { AccessKeyItem } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'netflix-nftoken-jwt-secret-key-2026';

export interface AdminPayload {
  username: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

export function createAdminToken(username: string): string {
  return jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminTokenFromHeaderOrCookie(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    const cookieToken = req.cookies.get('admin_token')?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;
    return decoded && decoded.role === 'admin';
  } catch (err) {
    return false;
  }
}

export function formatRemainingTime(expiresAt: string | null | undefined): {
  remaining_seconds: number | null;
  text_ar: string;
  text_en: string;
  is_permanent: boolean;
} {
  if (!expiresAt) {
    return {
      remaining_seconds: null,
      text_ar: 'دائم (غير محدد)',
      text_en: 'Permanent (Never expires)',
      is_permanent: true,
    };
  }

  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffSec = Math.floor((exp - now) / 1000);

  if (diffSec <= 0) {
    return {
      remaining_seconds: 0,
      text_ar: 'منتهي الصلاحية',
      text_en: 'Expired',
      is_permanent: false,
    };
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  let textAr = '';
  let textEn = '';

  if (days > 0) {
    textAr = `${days} يوم و ${hours} ساعة`;
    textEn = `${days}d ${hours}h`;
  } else if (hours > 0) {
    textAr = `${hours} ساعة و ${minutes} دقيقة`;
    textEn = `${hours}h ${minutes}m`;
  } else {
    textAr = `${minutes} دقيقة`;
    textEn = `${minutes}m`;
  }

  return {
    remaining_seconds: diffSec,
    text_ar: textAr,
    text_en: textEn,
    is_permanent: false,
  };
}

export async function verifyAccessKey(
  keyStr: string | null | undefined,
  incrementUse = false
): Promise<{
  valid: boolean;
  keyInfo: AccessKeyItem | null;
  error: string | null;
}> {
  if (!keyStr || !keyStr.trim()) {
    return { valid: false, keyInfo: null, error: 'Please enter your access key. (يرجى إدخال مفتاح الوصول)' };
  }

  const keyItem = await getAccessKey(keyStr.trim());
  if (!keyItem) {
    return { valid: false, keyInfo: null, error: 'Invalid access key. (مفتاح الوصول غير صحيح)' };
  }

  if (keyItem.status === 'disabled') {
    return { valid: false, keyInfo: keyItem, error: 'This access key has been disabled. (تم تعطيل هذا المفتاح)' };
  }

  if (keyItem.expires_at) {
    const exp = new Date(keyItem.expires_at).getTime();
    if (Date.now() > exp) {
      return { valid: false, keyInfo: keyItem, error: 'This access key has expired. (انتهت صلاحية هذا المفتاح)' };
    }
  }

  if (keyItem.max_uses !== null && keyItem.max_uses !== undefined) {
    if (keyItem.used_count >= keyItem.max_uses) {
      return {
        valid: false,
        keyInfo: keyItem,
        error: 'Access key usage limit reached. (تم استنفاد الحد الأقصى لاستخدام المفتاح)',
      };
    }
  }

  if (incrementUse) {
    keyItem.used_count = (keyItem.used_count || 0) + 1;
    keyItem.last_used_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await saveAccessKey(keyItem);
  }

  return { valid: true, keyInfo: keyItem, error: null };
}

export function extractAccessKeyFromRequest(req: NextRequest): string {
  const headerKey = req.headers.get('x-access-key');
  if (headerKey) return headerKey.trim();

  const cookieKey = req.cookies.get('_nfkey')?.value;
  if (cookieKey) return cookieKey.trim();

  const queryKey = req.nextUrl.searchParams.get('key');
  if (queryKey) return queryKey.trim();

  return '';
}
