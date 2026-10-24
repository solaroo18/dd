import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { isMongoConfigured } from '@/lib/mongodb';
import os from 'os';

export async function GET(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    storage: isMongoConfigured() ? 'MongoDB Atlas (Connected)' : 'Local JSON Files (Fallback)',
    node_version: process.version,
    platform: os.platform(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
  });
}
