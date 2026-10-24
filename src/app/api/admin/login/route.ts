import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/db-service';
import { createAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Please enter both username and password.' }, { status: 400 });
    }

    const isValid = await verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid admin username or password.' }, { status: 401 });
    }

    const token = createAdminToken(username);

    const res = NextResponse.json({
      success: true,
      token,
      username,
      message: 'Admin logged in successfully.',
    });

    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400,
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
