import QRCode from 'qrcode';

export const API_URL = 'https://ios.prod.ftl.netflix.com/iosui/user/15.48';

export const QUERY_PARAMS: Record<string, string> = {
  appVersion: '15.48.1',
  config: JSON.stringify({
    gamesInTrailersEnabled: 'false',
    isTrailersEvidenceEnabled: 'false',
    cdsMyListSortEnabled: 'true',
    kidsBillboardEnabled: 'true',
    addHorizontalBoxArtToVideoSummariesEnabled: 'false',
    skOverlayTestEnabled: 'false',
    homeFeedTestTVMovieListsEnabled: 'false',
    baselineOnIpadEnabled: 'true',
    trailersVideoIdLoggingFixEnabled: 'true',
    postPlayPreviewsEnabled: 'false',
    bypassContextualAssetsEnabled: 'false',
    roarEnabled: 'false',
    useSeason1AltLabelEnabled: 'false',
    disableCDSSearchPaginationSectionKinds: ['searchVideoCarousel'],
    cdsSearchHorizontalPaginationEnabled: 'true',
    searchPreQueryGamesEnabled: 'true',
    kidsMyListEnabled: 'true',
    billboardEnabled: 'true',
    useCDSGalleryEnabled: 'true',
    contentWarningEnabled: 'true',
    videosInPopularGamesEnabled: 'true',
    avifFormatEnabled: 'false',
    sharksEnabled: 'true',
  }),
  device_type: 'NFAPPL-02-',
  esn: 'NFAPPL-02-IPHONE8%3D1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200',
  idiom: 'phone',
  iosVersion: '15.8.5',
  isTablet: 'false',
  languages: 'en-US',
  locale: 'en-US',
  maxDeviceWidth: '375',
  model: 'saget',
  modelType: 'IPHONE8-1',
  odpAware: 'true',
  path: '["account","token","default"]',
  pathFormat: 'graph',
  pixelDensity: '2.0',
  progressive: 'false',
  responseFormat: 'json',
};

export const BASE_HEADERS: Record<string, string> = {
  'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',
  'x-netflix.request.attempt': '1',
  'x-netflix.request.client.user.guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',
  'x-netflix.context.profile-guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',
  'x-netflix.request.routing': '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
  'x-netflix.context.app-version': '15.48.1',
  'x-netflix.argo.translated': 'true',
  'x-netflix.context.form-factor': 'phone',
  'x-netflix.context.sdk-version': '2012.4',
  'x-netflix.client.appversion': '15.48.1',
  'x-netflix.context.max-device-width': '375',
  'x-netflix.context.ab-tests': '',
  'x-netflix.tracing.cl.useractionid': '4DC655F2-9C3C-4343-8229-CA1B003C3053',
  'x-netflix.client.type': 'argo',
  'x-netflix.client.ftl.esn':
    'NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200',
  'x-netflix.context.locales': 'en-US',
  'x-netflix.context.top-level-uuid': '90AFE39F-ADF1-4D8A-B33E-528730990FE3',
  'x-netflix.client.iosversion': '15.8.5',
  'accept-language': 'en-US;q=1',
  'x-netflix.argo.abtests': '',
  'x-netflix.context.os-version': '15.8.5',
  'x-netflix.request.client.context': '{"appState":"foreground"}',
  'x-netflix.context.ui-flavor': 'argo',
  'x-netflix.argo.nfnsm': '9',
  'x-netflix.context.pixel-density': '2.0',
  'x-netflix.request.toplevel.uuid': '90AFE39F-ADF1-4D8A-B33E-528730990FE3',
  'x-netflix.request.client.timezoneid': 'Asia/Dhaka',
};

export const COOKIE_KEYS = ['NetflixId', 'SecureNetflixId', 'nfvdid', 'OptanonConsent'] as const;
export const REQUIRED_COOKIE = 'NetflixId';

export function decodeCookieValue(val: string): string {
  if (typeof val === 'string' && val.includes('%')) {
    try {
      return decodeURIComponent(val);
    } catch (_) {
      return val;
    }
  }
  return val;
}

export function extractCookieDict(text: string): Record<string, string> {
  const cookieDict: Record<string, string> = {};
  if (!text || typeof text !== 'string') return cookieDict;

  // 1. Netscape Cookie format
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const name = parts[5];
      const value = parts[6];
      if (name && value) {
        cookieDict[name] = value;
      }
    }
  }

  // 2. JSON format
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const name = item?.name;
        const value = item?.value;
        if (name && COOKIE_KEYS.includes(name as any) && typeof value === 'string') {
          cookieDict[name] = decodeCookieValue(value);
        }
      }
    } else if (parsed && typeof parsed === 'object') {
      for (const key of COOKIE_KEYS) {
        if (typeof parsed[key] === 'string') {
          cookieDict[key] = decodeCookieValue(parsed[key]);
        }
      }
      if (Array.isArray(parsed.cookies)) {
        for (const item of parsed.cookies) {
          const name = item?.name;
          const value = item?.value;
          if (name && COOKIE_KEYS.includes(name as any) && typeof value === 'string') {
            cookieDict[name] = decodeCookieValue(value);
          }
        }
      }
    }
  } catch (_) {}

  // 3. Name=Value regex search
  for (const key of COOKIE_KEYS) {
    if (cookieDict[key]) continue;
    const regex = new RegExp(`(?:^|[;\\s,])${key}=([^;,\\s]+)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      cookieDict[key] = decodeCookieValue(match[1]);
    }
  }

  return cookieDict;
}

export function detectCookieFormat(text: string): string {
  if (!text) return 'unknown';
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json';
  if (trimmed.includes('\t') && (trimmed.includes('.netflix.com') || trimmed.includes('TRUE') || trimmed.includes('FALSE'))) {
    return 'netscape';
  }
  if (trimmed.includes('NetflixId=')) return 'header';
  return 'raw';
}

export async function generateQrBase64(dataString: string): Promise<string> {
  try {
    return await QRCode.toDataURL(dataString, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR generation error:', err);
    return '';
  }
}

export async function fetchNftokenApi(cookieDict: Record<string, string>): Promise<{
  token: string | null;
  expires: number | null;
  error: string | null;
}> {
  const netflixId = cookieDict[REQUIRED_COOKIE];
  if (!netflixId) {
    return { token: null, expires: null, error: 'Missing required cookie: NetflixId (الكوكيز لا يحتوي على NetflixId)' };
  }

  const cookieHeaderParts = [`NetflixId=${netflixId}`];
  if (cookieDict['SecureNetflixId']) {
    cookieHeaderParts.push(`SecureNetflixId=${cookieDict['SecureNetflixId']}`);
  }
  if (cookieDict['nfvdid']) {
    cookieHeaderParts.push(`nfvdid=${cookieDict['nfvdid']}`);
  }

  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    Cookie: cookieHeaderParts.join('; '),
  };

  const queryUrl = new URL(API_URL);
  for (const [k, v] of Object.entries(QUERY_PARAMS)) {
    queryUrl.searchParams.append(k, v);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(queryUrl.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      return {
        token: null,
        expires: null,
        error: `Netflix server returned status ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const tokenData = data?.value?.account?.token?.default;
    const token = tokenData?.token;
    let expires = tokenData?.expires;

    if (!token) {
      const innerError = data?.error || data?.message;
      return {
        token: null,
        expires: null,
        error: innerError ? `Netflix response error: ${innerError}` : 'No token found in response. The cookie might be expired or invalid.',
      };
    }

    if (typeof expires === 'number' && expires.toString().length === 13) {
      expires = Math.floor(expires / 1000);
    }

    return { token, expires, error: null };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { token: null, expires: null, error: 'Connection timed out connecting to Netflix API' };
    }
    return { token: null, expires: null, error: `Network request error: ${err.message}` };
  }
}

export function formatExpiry(expires: number | string | null | undefined): string {
  if (!expires) return 'Unknown';
  try {
    const ts = typeof expires === 'string' ? parseInt(expires, 10) : expires;
    const d = new Date(ts * 1000);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch (_) {
    return String(expires);
  }
}

export async function buildTokenPayload(token: string, expires: number | null, accountName = 'Pool Account') {
  const encodedToken = encodeURIComponent(token);
  const loginUrl = `https://www.netflix.com/youraccount?nftoken=${encodedToken}`;
  const browseUrl = `https://www.netflix.com/browse?nftoken=${encodedToken}`;
  const tvActivationUrl = `https://www.netflix.com/tv8?nftoken=${encodedToken}`;
  const unsupportedUrl = `https://www.netflix.com/unsupported?nftoken=${encodedToken}`;
  const directTvUrl = 'https://www.netflix.com/tv8';

  const [loginQr, tvQr, unsupportedQr] = await Promise.all([
    generateQrBase64(loginUrl),
    generateQrBase64(tvActivationUrl),
    generateQrBase64(unsupportedUrl),
  ]);

  return {
    success: true,
    token,
    login_url: loginUrl,
    browse_url: browseUrl,
    tv_activation_url: tvActivationUrl,
    unsupported_url: unsupportedUrl,
    direct_tv_url: directTvUrl,
    expires_timestamp: expires,
    expires_formatted: formatExpiry(expires),
    login_qr: loginQr,
    tv_qr: tvQr,
    unsupported_qr: unsupportedQr,
    used_cookie_name: accountName,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
}
