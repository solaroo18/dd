import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { addCookieToPool } from '@/lib/db-service';
import { extractCookieDict, detectCookieFormat, REQUIRED_COOKIE } from '@/lib/netflix';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const inputPath = path.join(process.cwd(), 'input.txt');
  if (!fs.existsSync(inputPath)) {
    return NextResponse.json({ success: false, error: 'input.txt not found.' }, { status: 404 });
  }

  const content = fs.readFileSync(inputPath, 'utf-8').trim();
  if (!content) {
    return NextResponse.json({ success: false, error: 'input.txt is empty.' }, { status: 400 });
  }

  const cookieDict = extractCookieDict(content);
  if (!cookieDict || !cookieDict[REQUIRED_COOKIE]) {
    return NextResponse.json({ success: false, error: 'No valid NetflixId found in input.txt.' }, { status: 400 });
  }

  const format = detectCookieFormat(content);
  const netflixIdVal = cookieDict[REQUIRED_COOKIE];
  const preview = netflixIdVal.length > 20 ? netflixIdVal.slice(0, 15) + '...' : netflixIdVal;

  const item = await addCookieToPool({
    name: 'Imported from input.txt',
    raw: content,
    netflix_id_preview: preview,
    format,
    status: 'active',
    pool_type: 'paid',
  });

  return NextResponse.json({
    success: true,
    message: 'Successfully imported cookie from input.txt.',
    cookie: item,
  });
}
