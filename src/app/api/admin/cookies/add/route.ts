import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { addCookieToPool } from '@/lib/db-service';
import { extractCookieDict, detectCookieFormat, REQUIRED_COOKIE } from '@/lib/netflix';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawInput = (body.cookies_text || body.raw || body.cookie || body.text || '').trim();
  const baseName = (body.name || '').trim() || 'Account';
  const poolType = body.pool_type === 'vip' ? 'vip' : 'paid';

  if (!rawInput) {
    return NextResponse.json({ success: false, error: 'Cookie content cannot be empty.' }, { status: 400 });
  }

  // Split by delimiter if user pasted multiple cookies (e.g., separated by '---' or '===')
  let chunks = rawInput.split(/\n\s*---\s*\n|\n\s*===\s*\n/);
  if (chunks.length === 1 && rawInput.startsWith('[') && rawInput.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(rawInput);
      if (Array.isArray(parsedJson) && parsedJson.length > 0 && Array.isArray(parsedJson[0])) {
        chunks = parsedJson.map((sub) => JSON.stringify(sub));
      }
    } catch (_) {}
  }

  let addedCount = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const cleanChunk = chunks[idx].trim();
    if (!cleanChunk) continue;

    const cookieDict = extractCookieDict(cleanChunk);
    if (!cookieDict || !cookieDict[REQUIRED_COOKIE]) {
      errors.push(`Chunk #${idx + 1}: Could not find valid NetflixId.`);
      continue;
    }

    const format = detectCookieFormat(cleanChunk);
    const netflixIdVal = cookieDict[REQUIRED_COOKIE];
    const preview = netflixIdVal.length > 20 ? netflixIdVal.slice(0, 15) + '...' : netflixIdVal;
    const itemName = chunks.length > 1 ? `${baseName} #${idx + 1}` : baseName;

    await addCookieToPool({
      name: itemName,
      raw: cleanChunk,
      netflix_id_preview: preview,
      format,
      status: 'active',
      pool_type: poolType,
    });
    addedCount++;
  }

  if (addedCount === 0) {
    return NextResponse.json(
      {
        success: false,
        error: errors[0] || 'No valid cookies found in input (Missing NetflixId).',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    added: addedCount,
    message: addedCount === 1 ? 'Cookie added successfully.' : `Successfully added ${addedCount} accounts.`,
  });
}
