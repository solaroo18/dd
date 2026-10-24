import { NextRequest, NextResponse } from 'next/server';
import { generateQrBase64 } from '@/lib/netflix';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get('data') || req.nextUrl.searchParams.get('url') || '';
  if (!data) {
    return NextResponse.json({ success: false, error: 'Data parameter is required' }, { status: 400 });
  }

  const qrBase64 = await generateQrBase64(data);
  return NextResponse.json({ success: true, qr: qrBase64 });
}
