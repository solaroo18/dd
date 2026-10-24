import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenFromHeaderOrCookie } from '@/lib/auth';
import { addCookieToPool } from '@/lib/db-service';
import { extractCookieDict, detectCookieFormat, REQUIRED_COOKIE } from '@/lib/netflix';

export async function POST(req: NextRequest) {
  if (!verifyAdminTokenFromHeaderOrCookie(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawText = (body.text || body.bulk || '').trim();
  const poolType = body.pool_type === 'vip' ? 'vip' : 'paid';

  if (!rawText) {
    return NextResponse.json({ success: false, error: 'No cookie data provided.' }, { status: 400 });
  }

  // Split by chunks (e.g. separated by "---" or by JSON arrays or multiple cookies)
  let chunks: string[] = [];
  if (rawText.includes('---')) {
    chunks = rawText.split(/---+/).map((s) => s.trim()).filter(Boolean);
  } else {
    // Try parse as JSON array
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'object' && parsed[0].raw) {
          // array of cookie objects
          chunks = parsed.map((p) => p.raw);
        } else {
          chunks = [rawText];
        }
      } else {
        chunks = [rawText];
      }
    } catch (_) {
      chunks = [rawText];
    }
  }

  let addedCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const dict = extractCookieDict(chunk);
    if (dict[REQUIRED_COOKIE]) {
      const fmt = detectCookieFormat(chunk);
      const val = dict[REQUIRED_COOKIE];
      await addCookieToPool({
        name: `Imported ${i + 1} (${new Date().toISOString().substring(5, 10)})`,
        raw: chunk,
        netflix_id_preview: val.slice(0, 15) + '...',
        format: fmt,
        status: 'active',
        pool_type: poolType,
      });
      addedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    added: addedCount,
    message: `Successfully imported ${addedCount} accounts.`,
  });
}
