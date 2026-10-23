import json
import os
import re
import threading
import urllib.parse
import hashlib
import hmac
from datetime import datetime, timedelta
import io
import base64
import random
import uuid
import time
import secrets
from collections import defaultdict
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

from flask import Flask, render_template, request, jsonify, session, abort
import requests
from urllib3.exceptions import InsecureRequestWarning
import qrcode

requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
DATA_DIR = "/tmp" if IS_VERCEL else os.environ.get("DATA_DIR", BASE_DIR)

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "static"),
    template_folder=os.path.join(BASE_DIR, "templates")
)

def get_storage_path(filename):
    """
    Resolve absolute path for reading/writing data.
    In Vercel serverless environment, data files reside in /tmp.
    If the file does not exist in /tmp, check BASE_DIR to seed from initial repository file.
    """
    dest = os.path.join(DATA_DIR, filename)
    if IS_VERCEL and not os.path.exists(dest):
        src = os.path.join(BASE_DIR, filename)
        if os.path.exists(src):
            try:
                import shutil
                shutil.copy2(src, dest)
            except Exception:
                pass
    return dest


def safe_load_json(filename, default_val=None):
    """Safely load JSON data with Vercel and repository fallbacks."""
    if default_val is None:
        default_val = {}
    path = get_storage_path(filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    base_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(base_path):
        try:
            with open(base_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default_val


def safe_save_json(filename, data):
    """Safely write JSON data with atomic rename and /tmp fallback for serverless."""
    dest = get_storage_path(filename)
    try:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        tmp = f"{dest}.tmp.{os.getpid()}.{secrets.token_hex(4)}"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, dest)
        return True
    except Exception:
        # Fallback to direct /tmp if write permissions fail in current DATA_DIR
        try:
            fallback = os.path.join("/tmp", os.path.basename(filename))
            tmp = f"{fallback}.tmp.{os.getpid()}"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp, fallback)
            return True
        except Exception:
            return False


# Persistent secret key shared across all Gunicorn workers and restarts
def load_or_generate_secret_key():
    """Load or generate a persistent secret key for Flask sessions and HMAC signing."""
    env_key = os.environ.get("FLASK_SECRET_KEY")
    if env_key and len(env_key.strip()) >= 16:
        return env_key.strip()

    secret_file = os.path.join(DATA_DIR, ".flask_secret")
    try:
        if os.path.exists(secret_file):
            with open(secret_file, "r", encoding="utf-8") as f:
                key = f.read().strip()
                if len(key) >= 32:
                    return key
        new_key = secrets.token_hex(32)
        with open(secret_file, "w", encoding="utf-8") as f:
            f.write(new_key)
        try:
            os.chmod(secret_file, 0o600)
        except Exception:
            pass
        return new_key
    except Exception:
        return "netflix-token-gen-fallback-secret-2026-secure-key"

SECRET_KEY_VALUE = load_or_generate_secret_key()
app.secret_key = SECRET_KEY_VALUE
# Limit max body size to 2MB to prevent denial of service (DoS) memory exhaustion
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
app.config["TEMPLATES_AUTO_RELOAD"] = True
# Secure session cookies
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == "production"

# Security Response Headers (OWASP Hardening)
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://pl31836477.profitableratecpmnetwork.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    # Remove server identification
    response.headers["Server"] = "Vercel-Protected"
    # Prevent caching of sensitive API responses
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response

INPUT_FILE = "input.txt"
HISTORY_FILE = "history.json"
POOL_FILE = "cookies_pool.json"
CONFIG_FILE = "admin_config.json"
DEVICE_LIMITS_FILE = "device_limits.json"
ACCESS_KEYS_FILE = "access_keys.json"
USER_SESSIONS_FILE = "user_sessions.json"


DAILY_DEVICE_LIMIT = 3

DEFAULT_ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "cuberwise18")
# Password is ONLY read from admin_config.json (hashed) or ADMIN_PASSWORD env var.
# Never hardcode plaintext passwords in source code.
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
SERVER_START_TIME = datetime.now()

# Global request rate limiter (per IP across all endpoints)
GLOBAL_RATE_LIMITS = defaultdict(list)  # ip -> [timestamps]
GLOBAL_RATE_MAX = 120  # max requests per minute per IP
GLOBAL_RATE_WINDOW = 60  # seconds

# CSRF Token store
CSRF_TOKENS = {}  # token -> expiry timestamp
CSRF_TOKEN_TTL = 3600  # 1 hour

API_URL = "https://ios.prod.ftl.netflix.com/iosui/user/15.48"

QUERY_PARAMS = {
    "appVersion": "15.48.1",
    "config": '{"gamesInTrailersEnabled":"false","isTrailersEvidenceEnabled":"false","cdsMyListSortEnabled":"true","kidsBillboardEnabled":"true","addHorizontalBoxArtToVideoSummariesEnabled":"false","skOverlayTestEnabled":"false","homeFeedTestTVMovieListsEnabled":"false","baselineOnIpadEnabled":"true","trailersVideoIdLoggingFixEnabled":"true","postPlayPreviewsEnabled":"false","bypassContextualAssetsEnabled":"false","roarEnabled":"false","useSeason1AltLabelEnabled":"false","disableCDSSearchPaginationSectionKinds":["searchVideoCarousel"],"cdsSearchHorizontalPaginationEnabled":"true","searchPreQueryGamesEnabled":"true","kidsMyListEnabled":"true","billboardEnabled":"true","useCDSGalleryEnabled":"true","contentWarningEnabled":"true","videosInPopularGamesEnabled":"true","avifFormatEnabled":"false","sharksEnabled":"true"}',
    "device_type": "NFAPPL-02-",
    "esn": "NFAPPL-02-IPHONE8%3D1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
    "idiom": "phone",
    "iosVersion": "15.8.5",
    "isTablet": "false",
    "languages": "en-US",
    "locale": "en-US",
    "maxDeviceWidth": "375",
    "model": "saget",
    "modelType": "IPHONE8-1",
    "odpAware": "true",
    "path": '["account","token","default"]',
    "pathFormat": "graph",
    "pixelDensity": "2.0",
    "progressive": "false",
    "responseFormat": "json",
}

BASE_HEADERS = {
    "User-Agent": "Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)",
    "x-netflix.request.attempt": "1",
    "x-netflix.request.client.user.guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
    "x-netflix.context.profile-guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
    "x-netflix.request.routing": '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
    "x-netflix.context.app-version": "15.48.1",
    "x-netflix.argo.translated": "true",
    "x-netflix.context.form-factor": "phone",
    "x-netflix.context.sdk-version": "2012.4",
    "x-netflix.client.appversion": "15.48.1",
    "x-netflix.context.max-device-width": "375",
    "x-netflix.context.ab-tests": "",
    "x-netflix.tracing.cl.useractionid": "4DC655F2-9C3C-4343-8229-CA1B003C3053",
    "x-netflix.client.type": "argo",
    "x-netflix.client.ftl.esn": "NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
    "x-netflix.context.locales": "en-US",
    "x-netflix.context.top-level-uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
    "x-netflix.client.iosversion": "15.8.5",
    "accept-language": "en-US;q=1",
    "x-netflix.argo.abtests": "",
    "x-netflix.context.os-version": "15.8.5",
    "x-netflix.request.client.context": '{"appState":"foreground"}',
    "x-netflix.context.ui-flavor": "argo",
    "x-netflix.argo.nfnsm": "9",
    "x-netflix.context.pixel-density": "2.0",
    "x-netflix.request.toplevel.uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
    "x-netflix.request.client.timezoneid": "Asia/Dhaka",
}

COOKIE_KEYS = ("NetflixId", "SecureNetflixId", "nfvdid", "OptanonConsent")
REQUIRED_COOKIE = "NetflixId"


# -------------------------------------------------------------
# Security & Rate Limiting Engine
# -------------------------------------------------------------
LOGIN_FAILURES = defaultdict(list)    # ip -> [timestamps]
IP_LOCKOUTS = {}                      # ip -> lockout_expiry_time
RATE_LIMITS = defaultdict(list)       # ip:endpoint -> [timestamps]
SESSIONS_FILE = "admin_sessions.json"
SESSION_TTL = 12 * 3600               # 12 hours session life
LAST_CLEANUP = time.time()
CLEANUP_INTERVAL = 300                # Clean up every 5 minutes


def load_admin_sessions():
    """Load active sessions from persistent JSON file safely."""
    return safe_load_json(SESSIONS_FILE, {})


def save_admin_sessions(sessions):
    """Atomically save active sessions to persistent JSON file."""
    safe_save_json(SESSIONS_FILE, sessions)


def cleanup_expired_data():
    """Periodically purge expired entries from in-memory and persistent stores to prevent memory leaks."""
    global LAST_CLEANUP
    now = time.time()
    if now - LAST_CLEANUP < CLEANUP_INTERVAL:
        return
    LAST_CLEANUP = now

    # Clean expired lockouts
    expired_ips = [ip for ip, exp in IP_LOCKOUTS.items() if now > exp]
    for ip in expired_ips:
        IP_LOCKOUTS.pop(ip, None)
        LOGIN_FAILURES.pop(ip, None)

    # Clean expired admin sessions from file
    try:
        sessions = load_admin_sessions()
        if sessions:
            active = {k: v for k, v in sessions.items() if now < v.get("expires", 0)}
            if len(active) != len(sessions):
                save_admin_sessions(active)
    except Exception:
        pass

    # Clean expired CSRF tokens
    expired_csrf = [t for t, exp in CSRF_TOKENS.items() if now > exp]
    for t in expired_csrf:
        del CSRF_TOKENS[t]

    # Clean old rate limit entries
    stale_keys = [k for k, v in RATE_LIMITS.items() if not v or now - max(v) > 120]
    for k in stale_keys:
        del RATE_LIMITS[k]
    stale_global = [k for k, v in GLOBAL_RATE_LIMITS.items() if not v or now - max(v) > 120]
    for k in stale_global:
        del GLOBAL_RATE_LIMITS[k]


def get_client_ip():
    """Extract real client IP, supporting Cloudflare (CF-Connecting-IP), X-Real-IP, and X-Forwarded-For."""
    for header in ("CF-Connecting-IP", "X-Real-IP", "True-Client-IP"):
        val = request.headers.get(header)
        if val:
            ip = val.split(",")[0].strip()
            if re.match(r'^[\d\.]+$', ip) or re.match(r'^[\da-fA-F:]+$', ip):
                return ip
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        # Basic IP format validation
        if re.match(r'^[\d\.]+$', ip) or re.match(r'^[\da-fA-F:]+$', ip):
            return ip
    return request.remote_addr or "127.0.0.1"


def check_global_rate_limit(ip):
    """Global rate limiter: max GLOBAL_RATE_MAX requests per GLOBAL_RATE_WINDOW seconds per IP."""
    now = time.time()
    GLOBAL_RATE_LIMITS[ip] = [t for t in GLOBAL_RATE_LIMITS[ip] if now - t < GLOBAL_RATE_WINDOW]
    if len(GLOBAL_RATE_LIMITS[ip]) >= GLOBAL_RATE_MAX:
        return False
    GLOBAL_RATE_LIMITS[ip].append(now)
    return True


@app.before_request
def global_security_checks():
    """Run global security checks before every request."""
    cleanup_expired_data()

    # Block requests with suspiciously large headers (header injection prevention)
    total_header_size = sum(len(k) + len(v) for k, v in request.headers)
    if total_header_size > 16384:  # 16KB max headers
        abort(413)

    # Global rate limiting for API endpoints
    if request.path.startswith("/api/"):
        ip = get_client_ip()
        if not check_global_rate_limit(ip):
            return jsonify({
                "success": False,
                "error": "تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار قليلاً."
            }), 429

    # Validate Content-Type for POST/PUT requests with body
    if request.method in ("POST", "PUT") and request.content_length and request.content_length > 0:
        content_type = request.content_type or ""
        if not any(ct in content_type for ct in ["application/json", "multipart/form-data", "application/x-www-form-urlencoded"]):
            if request.path.startswith("/api/"):
                return jsonify({"success": False, "error": "Invalid content type"}), 415


def check_login_lockout(ip):
    now = time.time()
    if ip in IP_LOCKOUTS:
        if now < IP_LOCKOUTS[ip]:
            remaining = int(IP_LOCKOUTS[ip] - now)
            return False, remaining
        else:
            del IP_LOCKOUTS[ip]
            LOGIN_FAILURES.pop(ip, None)
    return True, 0


def record_login_failure(ip):
    now = time.time()
    LOGIN_FAILURES[ip] = [t for t in LOGIN_FAILURES[ip] if now - t < 900]
    LOGIN_FAILURES[ip].append(now)
    if len(LOGIN_FAILURES[ip]) >= 5:
        IP_LOCKOUTS[ip] = now + 900  # Lock out for 15 minutes
        return True
    return False


def record_login_success(ip):
    LOGIN_FAILURES.pop(ip, None)
    IP_LOCKOUTS.pop(ip, None)


def check_rate_limit(ip, endpoint, max_requests=25, window=60):
    now = time.time()
    key = f"{ip}:{endpoint}"
    RATE_LIMITS[key] = [t for t in RATE_LIMITS[key] if now - t < window]
    if len(RATE_LIMITS[key]) >= max_requests:
        return False
    RATE_LIMITS[key].append(now)
    return True


def generate_csrf_token():
    """Generate a CSRF token for forms and sensitive actions."""
    token = secrets.token_hex(32)
    CSRF_TOKENS[token] = time.time() + CSRF_TOKEN_TTL
    return token


def validate_csrf_token(token):
    """Validate and consume a CSRF token."""
    if not token:
        return False
    expiry = CSRF_TOKENS.pop(token, None)
    if expiry is None:
        return False
    return time.time() < expiry


def sanitize_input(text, max_length=10000):
    """Sanitize and truncate user input to prevent injection and DoS."""
    if not isinstance(text, str):
        return ""
    # Truncate to max length
    text = text[:max_length]
    # Remove null bytes
    text = text.replace("\x00", "")
    return text


# -------------------------------------------------------------
# Configuration & Admin Helpers
# -------------------------------------------------------------
def get_admin_config():
    cfg = {"username": DEFAULT_ADMIN_USERNAME, "password_hash": None}

    # 1. Environment variable for Vercel: ADMIN_CONFIG_DATA
    env_admin = os.environ.get("ADMIN_CONFIG_DATA")
    if env_admin:
        try:
            data = json.loads(env_admin)
            if isinstance(data, dict):
                cfg["username"] = data.get("username", DEFAULT_ADMIN_USERNAME)
                cfg["password_hash"] = data.get("password_hash")
                return cfg
        except Exception:
            pass

    # 2. Config file via safe_load_json
    data = safe_load_json(CONFIG_FILE, {})
    if data:
        cfg["username"] = data.get("username", DEFAULT_ADMIN_USERNAME)
        if "password_hash" in data:
            cfg["password_hash"] = data["password_hash"]
        elif "password" in data:
            new_hash = generate_password_hash(data["password"])
            cfg["password_hash"] = new_hash
            safe_save_json(CONFIG_FILE, {"username": cfg["username"], "password_hash": new_hash})

    # 3. Fallback: environment variable (for initial setup only)
    if not cfg["password_hash"] and DEFAULT_ADMIN_PASSWORD:
        cfg["password_hash"] = generate_password_hash(DEFAULT_ADMIN_PASSWORD)

    return cfg


def get_admin_username():
    return get_admin_config().get("username", DEFAULT_ADMIN_USERNAME)


def check_admin_password(provided_password):
    if not provided_password:
        return False
    config = get_admin_config()
    stored_hash = config.get("password_hash")
    if not stored_hash:
        return False
    return check_password_hash(stored_hash, provided_password)


def set_admin_credentials(new_user, new_pass):
    try:
        hashed = generate_password_hash(new_pass)
        safe_save_json(CONFIG_FILE, {"username": new_user, "password_hash": hashed})
        save_admin_sessions({})  # Invalidate all existing admin sessions upon credential change
        return True
    except Exception:
        return False


def sign_session_payload(payload_str):
    """Compute HMAC-SHA256 signature for session payload using SECRET_KEY_VALUE."""
    return hmac.new(SECRET_KEY_VALUE.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256).hexdigest()


def create_admin_session(username, client_ip):
    """Create a tamper-proof cryptographically signed token and record in persistent store."""
    sessions = load_admin_sessions()
    now = time.time()

    # Clean up expired sessions from persistent store
    active = {k: v for k, v in sessions.items() if now < v.get("expires", 0)}

    # Cap total sessions to 50
    if len(active) >= 50:
        sorted_sessions = sorted(active.items(), key=lambda x: x[1].get("created_at", 0))
        for old_token, _ in sorted_sessions[:25]:
            active.pop(old_token, None)

    sid = secrets.token_hex(16)
    expires = now + SESSION_TTL

    payload_dict = {
        "u": username,
        "exp": int(expires),
        "sid": sid,
        "cat": int(now)
    }
    raw_payload = json.dumps(payload_dict, separators=(',', ':'))
    b64_payload = base64.urlsafe_b64encode(raw_payload.encode('utf-8')).decode('utf-8').rstrip('=')
    signature = sign_session_payload(b64_payload)
    token = f"adm_{b64_payload}.{signature}"

    active[token] = {
        "username": username,
        "expires": expires,
        "ip": client_ip,
        "created_at": now,
        "last_seen": now
    }
    save_admin_sessions(active)
    return token


def verify_admin_token(token):
    """
    Verify admin token:
    1. Cryptographic HMAC validation (instant, uniform across all Gunicorn workers).
    2. Expiration validation.
    3. Persistent session file check (to ensure token was not revoked via logout/password change).
    Crucially: NEVER destroys session on client IP change (dynamic ISP, 4G/5G mobile, or CDN).
    """
    if not token or not isinstance(token, str):
        return False

    token = token.strip()
    now = time.time()

    # 1. Cryptographically signed token format: adm_<base64_payload>.<signature>
    if token.startswith("adm_") and "." in token:
        try:
            body = token[4:]  # strip 'adm_'
            b64_payload, signature = body.split(".", 1)
            expected_sig = sign_session_payload(b64_payload)
            if not secrets.compare_digest(signature, expected_sig):
                return False

            padding = '=' * (-len(b64_payload) % 4)
            raw_payload = base64.urlsafe_b64decode((b64_payload + padding).encode('utf-8')).decode('utf-8')
            payload = json.loads(raw_payload)

            # Check expiration
            if now > payload.get("exp", 0):
                return False

            # Check revocation in persistent sessions
            sessions = load_admin_sessions()
            if token not in sessions:
                # Token was revoked (e.g. logout or password change)
                return False

            sess_info = sessions[token]
            if now > sess_info.get("expires", 0):
                return False

            # Periodically update last_seen without blocking
            if now - sess_info.get("last_seen", 0) > 300:
                sess_info["last_seen"] = now
                sess_info["last_ip"] = get_client_ip()
                save_admin_sessions(sessions)
            return True
        except Exception:
            return False

    # 2. Fallback check in persistent sessions file (for legacy or direct tokens)
    sessions = load_admin_sessions()
    session_info = sessions.get(token)
    if not session_info:
        return False
    if now > session_info.get("expires", 0):
        return False
    return True


def require_admin(f):
    """Decorator to enforce admin authentication on endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not verify_admin_token(auth):
            return jsonify({"success": False, "error": "غير مصرح لك بالوصول"}), 403
        return f(*args, **kwargs)
    return decorated


# -------------------------------------------------------------
# Cookie Pool Management
# -------------------------------------------------------------
def load_pool():
    # 1. Environment variable support for Vercel Serverless (COOKIES_POOL_DATA)
    env_pool = os.environ.get("COOKIES_POOL_DATA")
    if env_pool:
        try:
            raw_str = env_pool.strip()
            if raw_str.startswith("ey") or raw_str.startswith("Ww"):
                try:
                    raw_str = base64.b64decode(raw_str).decode("utf-8")
                except Exception:
                    pass
            parsed = json.loads(raw_str)
            if isinstance(parsed, list) and parsed:
                return parsed
        except Exception:
            pass

    # 2. Load from storage using safe_load_json
    pool = safe_load_json(POOL_FILE, None)
    if isinstance(pool, list) and pool:
        return pool

    # 3. Auto seed from input.txt if it exists
    initial_pool = []
    input_path = get_storage_path(INPUT_FILE)
    if not os.path.exists(input_path):
        input_path = os.path.join(BASE_DIR, INPUT_FILE)
    if os.path.exists(input_path):
        try:
            with open(input_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if content and "NetflixId" in content:
                cd = extract_cookie_dict(content)
                if "NetflixId" in cd:
                    initial_pool.append({
                        "id": "cookie_initial",
                        "name": "حساب افتراضي 1",
                        "raw": content,
                        "netflix_id_preview": cd["NetflixId"][:15] + "...",
                        "format": detect_cookie_format(content),
                        "status": "active",
                        "pool_type": "paid",
                        "usage_count": 0,
                        "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "last_used": None,
                    })
        except Exception:
            pass
    if initial_pool:
        save_pool(initial_pool)
        return initial_pool

    return []


def save_pool(pool):
    safe_save_json(POOL_FILE, pool)


def get_active_cookies_count():
    pool = load_pool()
    return sum(1 for c in pool if c.get("status") == "active")


# -------------------------------------------------------------
# Cookie Parser Utilities
# -------------------------------------------------------------
def parse_netscape_cookie_line(line):
    parts = line.strip().split("\t")
    if len(parts) >= 7:
        return {parts[5]: parts[6]}
    return {}


def _decode_cookie_value(value):
    if isinstance(value, str) and "%" in value:
        try:
            return urllib.parse.unquote(value)
        except Exception:
            return value
    return value


def extract_cookie_dict(text):
    if not text:
        return {}
    cookie_dict = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        cookie_dict.update(parse_netscape_cookie_line(line))

    try:
        data = json.loads(text)
    except Exception:
        data = None

    if isinstance(data, list):
        for cookie in data:
            name = cookie.get("name")
            value = cookie.get("value")
            if name in COOKIE_KEYS and isinstance(value, str):
                cookie_dict[name] = _decode_cookie_value(value)
    elif isinstance(data, dict):
        if any(key in data for key in COOKIE_KEYS):
            for key in COOKIE_KEYS:
                value = data.get(key)
                if isinstance(value, str):
                    cookie_dict[key] = _decode_cookie_value(value)
        elif isinstance(data.get("cookies"), list):
            for cookie in data["cookies"]:
                name = cookie.get("name")
                value = cookie.get("value")
                if name in COOKIE_KEYS and isinstance(value, str):
                    cookie_dict[name] = _decode_cookie_value(value)

    for key in COOKIE_KEYS:
        if key in cookie_dict:
            continue
        match = re.search(rf"(?<!\w){re.escape(key)}=([^;,\s]+)", text)
        if match:
            cookie_dict[key] = _decode_cookie_value(match.group(1))

    return cookie_dict


def detect_cookie_format(text):
    if not text or not text.strip():
        return "empty"
    stripped = text.strip()
    if (stripped.startswith("{") and stripped.endswith("}")) or (stripped.startswith("[") and stripped.endswith("]")):
        return "json"
    if "\t" in stripped:
        return "netscape"
    if "NetflixId=" in stripped:
        return "raw"
    return "unknown"


def generate_qr_base64(data_string):
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,
            border=3,
        )
        qr.add_data(data_string)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#000000", back_color="#FFFFFF")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception:
        return None


def fetch_nftoken_api(cookie_dict):
    netflix_id = cookie_dict.get(REQUIRED_COOKIE)
    if not netflix_id:
        return None, None, "Missing required cookie: NetflixId (الكوكيز لا يحتوي على NetflixId)"

    headers = dict(BASE_HEADERS)
    cookie_parts = [f"NetflixId={netflix_id}"]
    if "SecureNetflixId" in cookie_dict:
        cookie_parts.append(f"SecureNetflixId={cookie_dict['SecureNetflixId']}")
    if "nfvdid" in cookie_dict:
        cookie_parts.append(f"nfvdid={cookie_dict['nfvdid']}")
    headers["Cookie"] = "; ".join(cookie_parts)

    try:
        response = requests.get(
            API_URL,
            params=QUERY_PARAMS,
            headers=headers,
            timeout=25,
            verify=False,
        )
    except requests.exceptions.Timeout:
        return None, None, "Connection timed out connecting to Netflix API (انتهت مهلة الاتصال بخوادم نتفلكس)"
    except requests.exceptions.RequestException as e:
        return None, None, f"Network request error: {str(e)}"

    if response.status_code != 200:
        return None, None, f"Netflix server returned status {response.status_code}: {response.text[:200]}"

    try:
        data = response.json()
    except Exception:
        return None, None, "Invalid JSON response from Netflix API"

    token_data = (
        (((data.get("value") or {}).get("account") or {}).get("token") or {}).get("default")
        or {}
    )
    token = token_data.get("token")
    expires = token_data.get("expires")

    if not token:
        inner_error = data.get("error") or data.get("message")
        if inner_error:
            return None, None, f"Netflix response error: {inner_error}"
        return None, None, "No token found in response. The cookie might be expired or invalid. (لم يتم العثور على توكن، قد يكون الكوكيز منتهي الصلاحية أو غير صالح)"

    if isinstance(expires, int) and len(str(expires)) == 13:
        expires //= 1000

    return token, expires, None


def load_history():
    return safe_load_json(HISTORY_FILE, [])


def save_history_item(item):
    history = load_history()
    if not isinstance(history, list):
        history = []
    history.insert(0, item)
    history = history[:50]
    safe_save_json(HISTORY_FILE, history)


# -------------------------------------------------------------
# Device Quota Limiter — Multi-Layer Fingerprint System
# Layers: IP/24 subnet + UA hash | Canvas fingerprint | HTTP-only cookie
# ANY matching layer links a request back to the same quota bucket.
# This makes bypass via incognito / different browser extremely hard.
# -------------------------------------------------------------
DEVICE_ALIASES_FILE = "device_aliases.json"   # maps every fingerprint → canonical bucket id


def load_device_limits():
    return safe_load_json(DEVICE_LIMITS_FILE, {})


def save_device_limits(data):
    safe_save_json(DEVICE_LIMITS_FILE, data)


def load_device_aliases():
    return safe_load_json(DEVICE_ALIASES_FILE, {})


def save_device_aliases(data):
    safe_save_json(DEVICE_ALIASES_FILE, data)


def _ip_subnet(ip_str):
    """Extract /24 subnet from IPv4 (e.g. '1.2.3.4' → '1.2.3').
    For IPv6 take first 4 groups."""
    if not ip_str:
        return "unknown"
    if ":" in ip_str:
        parts = ip_str.split(":")
        return ":".join(parts[:4])
    parts = ip_str.split(".")
    return ".".join(parts[:3]) if len(parts) >= 3 else ip_str


def _hash_string(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:24]


def collect_fingerprint_layers():
    """Return a list of fingerprint strings for the current request.
    Each layer is an independent signal that can identify the same physical device."""
    layers = []
    req_data = request.get_json(silent=True) or {}

    # Layer 1: IP/24 subnet + User-Agent family hash
    client_ip = get_client_ip()
    subnet = _ip_subnet(client_ip)
    ua_raw = request.headers.get("User-Agent", "unknown")[:256]
    # Normalise UA: strip version micro-numbers to make hash stable across minor updates
    ua_stable = re.sub(r'\d+\.\d+\.\d+', 'X', ua_raw)
    ip_ua_fp = f"ipua_{_hash_string(subnet + '|' + ua_stable)}"
    layers.append(ip_ua_fp)

    # Layer 2: Client-side canvas / screen fingerprint (sent by JS)
    canvas_fp = (
        request.headers.get("X-Canvas-FP")
        or req_data.get("canvas_fp")
    )
    if canvas_fp and isinstance(canvas_fp, str) and 8 <= len(canvas_fp) <= 128:
        clean_cfp = re.sub(r'[^a-zA-Z0-9_\-]', '', canvas_fp)[:64]
        if len(clean_cfp) >= 8:
            layers.append(f"cfp_{clean_cfp}")

    # Layer 3: Persistent HTTP-only tracking cookie (survives normal sessions)
    track_cookie = request.cookies.get("_nftrack")
    if track_cookie and isinstance(track_cookie, str) and 16 <= len(track_cookie) <= 64:
        clean_tc = re.sub(r'[^a-zA-Z0-9_\-]', '', track_cookie)[:64]
        if len(clean_tc) >= 16:
            layers.append(f"tc_{clean_tc}")

    # Layer 4: Legacy localStorage device_id header (still useful when available)
    dev_header = (
        request.headers.get("X-Device-Id")
        or req_data.get("device_id")
        or request.cookies.get("device_id")
    )
    if dev_header and isinstance(dev_header, str) and 8 <= len(dev_header) <= 64:
        clean_dev = re.sub(r'[^a-zA-Z0-9_\-]', '', dev_header)[:64]
        if len(clean_dev) >= 8:
            layers.append(f"ls_{clean_dev}")

    return layers


def resolve_device_bucket(layers):
    """Given fingerprint layers, find or create a canonical bucket ID.
    If ANY layer has been seen before, return the existing bucket so quotas merge.
    Otherwise create a new bucket and register all layers."""
    aliases = load_device_aliases()

    # Check if any layer already maps to a known bucket
    found_bucket = None
    for fp in layers:
        if fp in aliases:
            found_bucket = aliases[fp]
            break

    if not found_bucket:
        # New device — create bucket
        found_bucket = f"bucket_{secrets.token_hex(8)}"

    # Ensure ALL current layers point to this bucket (merge / link)
    changed = False
    for fp in layers:
        if aliases.get(fp) != found_bucket:
            aliases[fp] = found_bucket
            changed = True

    if changed:
        save_device_aliases(aliases)

    return found_bucket


def get_or_create_tracking_cookie():
    """Return existing tracking cookie value or generate a new one."""
    existing = request.cookies.get("_nftrack")
    if existing and isinstance(existing, str) and len(existing) >= 16:
        return existing, False
    new_val = secrets.token_hex(16)
    return new_val, True


def check_device_quota_multi():
    """Multi-layer quota check: resolves fingerprints → canonical bucket → quota."""
    layers = collect_fingerprint_layers()
    bucket_id = resolve_device_bucket(layers)

    today = datetime.now().strftime("%Y-%m-%d")
    limits = load_device_limits()
    record = limits.get(bucket_id, {})

    rec_date = record.get("date")
    current_count = record.get("count", 0) if rec_date == today else 0

    remaining = max(0, DAILY_DEVICE_LIMIT - current_count)
    allowed = current_count < DAILY_DEVICE_LIMIT
    return allowed, current_count, remaining, today, bucket_id


def increment_device_quota(bucket_id, action_type="activation"):
    today = datetime.now().strftime("%Y-%m-%d")
    limits = load_device_limits()
    record = limits.get(bucket_id, {})

    rec_date = record.get("date")
    if rec_date != today:
        current_count = 1
        history = []
    else:
        current_count = record.get("count", 0) + 1
        history = record.get("history", [])

    history.append({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "type": action_type,
        "ip": get_client_ip()
    })

    limits[bucket_id] = {
        "date": today,
        "count": current_count,
        "last_active": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "history": history[-10:]
    }
    save_device_limits(limits)
    remaining = max(0, DAILY_DEVICE_LIMIT - current_count)
    return current_count, remaining


# -------------------------------------------------------------
# Access Keys System (Private Access Gate)
# -------------------------------------------------------------
def load_access_keys():
    """Load access keys and settings from JSON file with Vercel env support."""
    # 1. Environment variable support for Vercel Serverless (ACCESS_KEYS_DATA)
    env_keys = os.environ.get("ACCESS_KEYS_DATA")
    if env_keys:
        try:
            raw_str = env_keys.strip()
            if raw_str.startswith("ey"):
                try:
                    raw_str = base64.b64decode(raw_str).decode("utf-8")
                except Exception:
                    pass
            parsed = json.loads(raw_str)
            if isinstance(parsed, dict):
                parsed.setdefault("settings", {"require_key": True})
                parsed.setdefault("keys", {})
                return parsed
        except Exception:
            pass

    # 2. Storage file via safe_load_json
    data = safe_load_json(ACCESS_KEYS_FILE, None)
    if isinstance(data, dict):
        data.setdefault("settings", {"require_key": True})
        data.setdefault("keys", {})
        return data

    initial = {
        "settings": {"require_key": True},
        "keys": {}
    }
    save_access_keys(initial)
    return initial


def save_access_keys(data):
    """Atomically save access keys and settings to JSON file."""
    safe_save_json(ACCESS_KEYS_FILE, data)


def is_key_required():
    """Check if the private access key gate is enabled in settings."""
    data = load_access_keys()
    return bool(data.get("settings", {}).get("require_key", True))


def generate_key_string(prefix="NF"):
    """Generate an elegant, high-entropy key: NF-XXXX-XXXX-XXXX (no confusing 0/O, 1/I chars)."""
    charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    p1 = "".join(secrets.choice(charset) for _ in range(4))
    p2 = "".join(secrets.choice(charset) for _ in range(4))
    p3 = "".join(secrets.choice(charset) for _ in range(4))
    return f"{prefix}-{p1}-{p2}-{p3}"


def get_request_access_key():
    """Extract access key from headers, cookies, query parameters, or JSON body."""
    # 1. Header X-Access-Key
    key = request.headers.get("X-Access-Key", "").strip()
    if key:
        return key
    # 2. Authorization Bearer header (if not admin token)
    auth = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if auth and not verify_admin_token(auth):
        key = auth
    # 3. Cookie _nfkey
    if not key:
        key = request.cookies.get("_nfkey", "").strip()
    # 4. URL Query string ?key=...
    if not key:
        key = request.args.get("key", "").strip()
    # 5. JSON request body
    if not key and request.is_json:
        try:
            body = request.get_json(silent=True) or {}
            key = (body.get("access_key") or body.get("key") or "").strip()
        except Exception:
            pass
    return key


# -------------------------------------------------------------
# User Account Binding & Daily Link Quotas (Max 3 links/day)
# -------------------------------------------------------------
def load_user_sessions():
    """Load user assigned accounts and daily link rotation quotas."""
    return safe_load_json(USER_SESSIONS_FILE, {})


def save_user_sessions(sessions):
    """Atomically save user sessions to file."""
    safe_save_json(USER_SESSIONS_FILE, sessions)


def get_user_session_id():
    """
    Get a persistent user identifier to bind their assigned Netflix account.
    Prioritizes:
    1. Authorized Access Key (if private gate is enabled/present)
    2. Client Device ID / Canvas Fingerprint header
    3. Tracking cookie _nftrack
    4. Client IP
    """
    req_key = get_request_access_key()
    if req_key:
        return f"key_{req_key.strip().upper()}"
    dev_id = request.headers.get("X-Device-Id") or request.headers.get("X-Canvas-FP")
    if dev_id and len(dev_id.strip()) > 8:
        return f"dev_{dev_id.strip()}"
    tc_val, _ = get_or_create_tracking_cookie()
    if tc_val:
        return f"track_{tc_val}"
    return f"ip_{get_client_ip()}"


def format_remaining_time(expires_at_str):
    """
    Format remaining time until access key expiration into human-readable text and seconds.
    Returns: dict with is_permanent, remaining_seconds, text_ar, text_en, formatted_expiry
    """
    if not expires_at_str or str(expires_at_str).lower() in ("never", "none", ""):
        return {
            "is_permanent": True,
            "remaining_seconds": None,
            "text_ar": "Permanent (Never expires)",
            "text_en": "Permanent (Never expires)",
            "formatted_expiry": "Never"
        }
    try:
        expires_dt = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S")
        total_sec = int((expires_dt - datetime.now()).total_seconds())
        if total_sec <= 0:
            return {
                "is_permanent": False,
                "remaining_seconds": 0,
                "text_ar": "Expired",
                "text_en": "Expired",
                "formatted_expiry": expires_at_str
            }

        days, rem = divmod(total_sec, 86400)
        hours, rem = divmod(rem, 3600)
        minutes, seconds = divmod(rem, 60)

        parts_en = []
        if days > 0:
            parts_en.append(f"{days}d")
        if hours > 0 or days > 0:
            parts_en.append(f"{hours}h")
        if days == 0 and minutes > 0:
            parts_en.append(f"{minutes}m")
        if days == 0 and hours == 0 and seconds > 0:
            parts_en.append(f"{seconds}s")

        en_str = "Remaining: " + (" ".join(parts_en) if parts_en else "0s")
        return {
            "is_permanent": False,
            "remaining_seconds": total_sec,
            "text_ar": en_str,
            "text_en": en_str,
            "formatted_expiry": expires_at_str
        }
    except Exception:
        return {
            "is_permanent": False,
            "remaining_seconds": None,
            "text_ar": "Unknown",
            "text_en": "Unknown",
            "formatted_expiry": str(expires_at_str)
        }


def verify_access_key(key_str, increment_use=False):
    """
    Verify access key validity.
    Returns: (is_valid: bool, key_info: dict or None, error_message: str or None)
    """
    # 1. Admin bypass: authenticated admin never needs a user key
    auth = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if verify_admin_token(auth):
        return True, {"key": "admin", "label": "Admin Bypass", "status": "active"}, None

    # 2. Global gate bypass if disabled by admin
    data = load_access_keys()
    if not data.get("settings", {}).get("require_key", True):
        return True, {"key": "none", "label": "Public", "status": "active"}, None

    if not key_str:
        return False, None, "Access key is required to use this service. Please enter a valid key."

    clean_key = key_str.strip().upper()
    keys = data.get("keys", {})

    matched_key_id = None
    for k in keys:
        if k.upper() == clean_key:
            matched_key_id = k
            break

    if not matched_key_id:
        return False, None, "Invalid access key. Please verify your key or contact support."

    key_info = keys[matched_key_id]

    # Check status
    status = key_info.get("status", "active")
    if status in ("revoked", "inactive"):
        return False, key_info, "This access key has been disabled by administration."

    # Check expiration date
    expires_at_str = key_info.get("expires_at")
    if expires_at_str:
        try:
            expires_dt = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S")
            if datetime.now() > expires_dt:
                key_info["status"] = "expired"
                save_access_keys(data)
                return False, key_info, f"This access key expired on {expires_at_str}."
        except Exception:
            pass

    # Check max uses limit
    max_uses = key_info.get("max_uses")
    used_count = key_info.get("used_count", 0)
    if max_uses is not None:
        try:
            max_u = int(max_uses)
            if max_u > 0 and used_count >= max_u:
                key_info["status"] = "exhausted"
                save_access_keys(data)
                return False, key_info, f"Usage limit reached for this access key ({max_u} uses)."
        except (ValueError, TypeError):
            pass

    # Increment usage counter
    if increment_use:
        key_info["used_count"] = used_count + 1
        key_info["last_used_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        key_info["last_ip"] = get_client_ip()
        device_id = request.headers.get("X-Device-Id") or get_client_ip()
        devices = key_info.setdefault("devices", [])
        if device_id and device_id not in devices:
            devices.append(device_id)
        if max_uses is not None:
            try:
                if int(max_uses) > 0 and key_info["used_count"] >= int(max_uses):
                    key_info["status"] = "exhausted"
            except Exception:
                pass
        save_access_keys(data)

    return True, key_info, None


# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admina")
@app.route("/admin")
def admin_page():
    return render_template("admin.html")


@app.route("/api/device/quota", methods=["GET"])
def device_quota_status():
    auth = request.headers.get("Authorization", "").replace("Bearer ", "")
    req_key = get_request_access_key()
    has_valid_key, key_info, _ = verify_access_key(req_key, increment_use=False)
    key_required = is_key_required()
    time_info = format_remaining_time(key_info.get("expires_at")) if (has_valid_key and key_info) else None

    # Device attempts limit is removed completely (unlimited)
    resp = jsonify({
        "success": True,
        "device_id": "unlimited",
        "today": datetime.now().strftime("%Y-%m-%d"),
        "limit": "unlimited",
        "used": 0,
        "remaining": "unlimited",
        "can_activate": True,
        "is_admin": verify_admin_token(auth),
        "key_required": key_required,
        "has_valid_key": has_valid_key,
        "key_label": key_info.get("label", "") if key_info else "",
        "key_time_info": time_info
    })
    # Set persistent tracking cookie
    tc_val, tc_new = get_or_create_tracking_cookie()
    if tc_new:
        resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
    return resp


@app.route("/api/access-key/verify", methods=["POST"])
def verify_access_key_endpoint():
    ip = get_client_ip()
    if not check_rate_limit(ip, "/api/access-key/verify", max_requests=40, window=60):
        return jsonify({"success": False, "error": "Too many attempts. Please wait a minute."}), 429

    data = request.get_json(silent=True) or {}
    key_str = (data.get("key") or request.args.get("key") or "").strip()
    if not key_str:
        return jsonify({"success": False, "error": "Please enter your access key."}), 400

    valid, key_info, err = verify_access_key(key_str, increment_use=False)
    if not valid:
        return jsonify({"success": False, "error": err}), 401

    time_info = format_remaining_time(key_info.get("expires_at"))
    resp = jsonify({
        "success": True,
        "message": "Access key verified successfully! Welcome.",
        "key": key_info.get("key"),
        "label": key_info.get("label", ""),
        "expires_at": key_info.get("expires_at"),
        "time_info": time_info,
        "remaining_seconds": time_info.get("remaining_seconds"),
        "remaining_text_ar": time_info.get("text_en"),
        "remaining_text_en": time_info.get("text_en"),
        "is_permanent": time_info.get("is_permanent"),
        "max_uses": key_info.get("max_uses"),
        "used_count": key_info.get("used_count", 0),
        "status": key_info.get("status", "active")
    })
    resp.set_cookie("_nfkey", key_info.get("key"), max_age=90*86400, httponly=False, samesite="Lax")
    return resp


@app.route("/api/access-key/status", methods=["GET"])
def access_key_status_endpoint():
    required = is_key_required()
    key_str = get_request_access_key()
    if not required:
        return jsonify({
            "success": True,
            "required": False,
            "has_valid_key": True,
            "key_info": {"key": key_str or "none", "label": "No Key Required"}
        })

    valid, key_info, err = verify_access_key(key_str, increment_use=False)
    time_info = format_remaining_time(key_info.get("expires_at")) if valid and key_info else None
    return jsonify({
        "success": True,
        "required": True,
        "has_valid_key": valid,
        "error": err if not valid else None,
        "key_info": {
            "key": key_info.get("key"),
            "label": key_info.get("label", ""),
            "expires_at": key_info.get("expires_at"),
            "time_info": time_info,
            "remaining_seconds": time_info.get("remaining_seconds") if time_info else None,
            "remaining_text_ar": time_info.get("text_ar") if time_info else None,
            "remaining_text_en": time_info.get("text_en") if time_info else None,
            "is_permanent": time_info.get("is_permanent") if time_info else False,
            "max_uses": key_info.get("max_uses"),
            "used_count": key_info.get("used_count", 0),
            "status": key_info.get("status")
        } if valid and key_info else None
    })



@app.route("/api/pool/status", methods=["GET"])
def pool_status():
    pool = load_pool()
    active_count = sum(1 for c in pool if c.get("status") == "active")
    total_count = len(pool)
    return jsonify({
        "success": True,
        "active_count": active_count,
        "total_count": total_count,
        "has_cookies": active_count > 0,
    })


@app.route("/api/generate-from-pool", methods=["POST"])
def generate_from_pool():
    auth = request.headers.get("Authorization", "").replace("Bearer ", "")
    is_admin = verify_admin_token(auth)
    bucket_id = None
    key_info = None

    # Read JSON request payload
    req_data = request.get_json(silent=True) or {}
    is_manual_rotate = bool(req_data.get("manual_rotate") or req_data.get("refresh") or request.headers.get("X-Manual-Rotate") == "1")

    # Check Private Access Key Gate
    if not is_admin and is_key_required():
        req_key = get_request_access_key()
        # Only increment key usage counter on manual rotation or initial key use
        valid_key, key_info, key_err = verify_access_key(req_key, increment_use=is_manual_rotate)
        if not valid_key:
            return jsonify({
                "success": False,
                "key_required": True,
                "error": key_err or "Access key is required or invalid."
            }), 401
    elif not is_admin:
        req_key = get_request_access_key()
        if req_key:
            _, key_info, _ = verify_access_key(req_key, increment_use=False)

    pool = load_pool()
    pool_modified = False
    for i, c in enumerate(pool):
        if not c.get("id"):
            c["id"] = f"cookie_{i}_{hash(c.get('raw', '')) & 0xFFFFFFFF:08x}"
            pool_modified = True
    if pool_modified:
        save_pool(pool)

    active_cookies = [c for c in pool if c.get("status") == "active"]
    if not active_cookies:
        return jsonify({
            "success": False,
            "error": "No active accounts in the pool currently. Please notify the administrator.",
            "details": "Cookie pool is empty or accounts are inactive",
            "daily_quota": {
                "limit": DAILY_ROTATION_LIMIT,
                "used": used_today,
                "remaining": remaining_today
            }
        }), 400

    assigned_cookie_id = user_session.get("assigned_cookie_id")
    cached_payload = user_session.get("payload")
    cached_expires = user_session.get("expires_timestamp")

    # Helper function to generate payload from a candidate cookie
    def generate_token_for_candidate(candidate):
        raw_cookie = candidate.get("raw", "")
        cookie_dict = extract_cookie_dict(raw_cookie)
        if not cookie_dict or REQUIRED_COOKIE not in cookie_dict:
            candidate["status"] = "invalid"
            save_pool(pool)
            return None, "Invalid cookie data in pool"

        token, expires, err = fetch_nftoken_api(cookie_dict)
        if err or not token:
            if "expired" in str(err).lower() or "no token found" in str(err).lower():
                candidate["status"] = "expired"
                save_pool(pool)
            return None, err

        candidate["usage_count"] = candidate.get("usage_count", 0) + 1
        candidate["last_used"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        candidate["last_status"] = "active"
        save_pool(pool)

        encoded_token = urllib.parse.quote(token, safe="")
        login_url = f"https://www.netflix.com/youraccount?nftoken={encoded_token}"
        browse_url = f"https://www.netflix.com/browse?nftoken={encoded_token}"
        tv_activation_url = f"https://www.netflix.com/tv8?nftoken={encoded_token}"
        unsupported_url = f"https://www.netflix.com/unsupported?nftoken={encoded_token}"
        direct_tv_url = "https://www.netflix.com/tv8"

        formatted_expires = "Unknown"
        if isinstance(expires, (int, float)):
            try:
                formatted_expires = datetime.fromtimestamp(expires).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                formatted_expires = str(expires)

        login_qr = generate_qr_base64(login_url)
        tv_qr = generate_qr_base64(tv_activation_url)
        unsupported_qr = generate_qr_base64(unsupported_url)

        res_payload = {
            "success": True,
            "token": token,
            "login_url": login_url,
            "browse_url": browse_url,
            "tv_activation_url": tv_activation_url,
            "unsupported_url": unsupported_url,
            "direct_tv_url": direct_tv_url,
            "expires_timestamp": expires,
            "expires_formatted": formatted_expires,
            "login_qr": login_qr,
            "tv_qr": tv_qr,
            "unsupported_qr": unsupported_qr,
            "used_cookie_name": candidate.get("name", "Pool Account"),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        save_history_item({
            "token_preview": token[:18] + "..." if len(token) > 18 else token,
            "full_token": token,
            "login_url": login_url,
            "tv_activation_url": tv_activation_url,
            "expires_formatted": formatted_expires,
            "account_name": candidate.get("name", "Pool Cookie"),
            "created_at": res_payload["created_at"],
        })
        return res_payload, None

    # CASE A: Page entry / normal reload / tab switch (NOT manual rotation)
    # Keep the exact same account until it expires, without burning daily link limit!
    if not is_manual_rotate and assigned_cookie_id and cached_payload:
        assigned_c = next((c for c in active_cookies if c.get("id") == assigned_cookie_id), None)
        if assigned_c:
            now_ts = datetime.now().timestamp()
            # If current token is still valid for at least 90 more seconds, reuse it directly!
            if cached_expires and float(cached_expires) > (now_ts + 90):
                res = dict(cached_payload)
                res["daily_quota"] = {
                    "limit": DAILY_ROTATION_LIMIT,
                    "used": used_today,
                    "remaining": remaining_today
                }
                res["device_quota"] = {
                    "limit": "unlimited",
                    "used": 0,
                    "remaining": "unlimited"
                }
                resp = jsonify(res)
                tc_val, tc_new = get_or_create_tracking_cookie()
                if tc_new:
                    resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
                return resp

            # Token expired or close to expiry: refresh from the SAME assigned cookie
            res_payload, err = generate_token_for_candidate(assigned_c)
            if res_payload:
                user_session["payload"] = res_payload
                user_session["expires_timestamp"] = res_payload.get("expires_timestamp")
                user_session["last_seen"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                sessions[user_id] = user_session
                save_user_sessions(sessions)

                res_payload["daily_quota"] = {
                    "limit": DAILY_ROTATION_LIMIT,
                    "used": used_today,
                    "remaining": remaining_today
                }
                res_payload["device_quota"] = {
                    "limit": "unlimited",
                    "used": 0,
                    "remaining": "unlimited"
                }
                resp = jsonify(res_payload)
                tc_val, tc_new = get_or_create_tracking_cookie()
                if tc_new:
                    resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
                return resp
            # If refreshing the assigned cookie failed (it died on Netflix), fall through to auto-swap with another cookie!

    # CASE B: Manual rotation requested OR initial visit OR assigned cookie expired
    # Prefer a candidate different from the currently assigned cookie if possible
    candidates = [c for c in active_cookies if c.get("id") != assigned_cookie_id]
    if not candidates:
        candidates = list(active_cookies)
    random.shuffle(candidates)

    last_error = None
    for candidate in candidates:
        res_payload, err = generate_token_for_candidate(candidate)
        if not res_payload:
            last_error = err
            continue

        # If this was a manual rotation by the user, increment today's rotation count
        if is_manual_rotate:
            daily["count"] = used_today + 1
            used_today = daily["count"]
            remaining_today = max(0, DAILY_ROTATION_LIMIT - used_today)

        # Update and persist user session
        user_session["assigned_cookie_id"] = candidate.get("id")
        user_session["payload"] = res_payload
        user_session["expires_timestamp"] = res_payload.get("expires_timestamp")
        user_session["last_seen"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sessions[user_id] = user_session
        save_user_sessions(sessions)

        res_payload["daily_quota"] = {
            "limit": DAILY_ROTATION_LIMIT,
            "used": used_today,
            "remaining": remaining_today
        }
        res_payload["device_quota"] = {
            "limit": "unlimited",
            "used": 0,
            "remaining": "unlimited"
        }

        resp = jsonify(res_payload)
        tc_val, tc_new = get_or_create_tracking_cookie()
        if tc_new:
            resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
        return resp

    return jsonify({
        "success": False,
        "error": "Failed to generate token from available cookies. Please try again later or notify the administrator.",
        "details": last_error or "All tested cookies failed",
        "daily_quota": {
            "limit": DAILY_ROTATION_LIMIT,
            "used": used_today,
            "remaining": remaining_today
        }
    }), 400


@app.route("/api/generate", methods=["POST"])
def generate_custom_token():
    auth = request.headers.get("Authorization", "").replace("Bearer ", "")
    is_admin = verify_admin_token(auth)
    bucket_id = None

    data = request.get_json(silent=True) or {}
    raw_cookie = sanitize_input(data.get("cookie", ""), max_length=50000).strip()

    if not raw_cookie:
        return generate_from_pool()

    # Check Private Access Key Gate
    if not is_admin and is_key_required():
        req_key = get_request_access_key()
        valid_key, key_info, key_err = verify_access_key(req_key, increment_use=True)
        if not valid_key:
            return jsonify({
                "success": False,
                "key_required": True,
                "error": key_err or "Access key is required or invalid."
            }), 401

    cookie_dict = extract_cookie_dict(raw_cookie)
    if not cookie_dict or REQUIRED_COOKIE not in cookie_dict:
        return jsonify({
            "success": False,
            "error": "NetflixId was not found in the cookie. Please ensure you copied the full cookie."
        }), 400

    token, expires, err = fetch_nftoken_api(cookie_dict)
    if err or not token:
        return jsonify({
            "success": False,
            "error": err or "Failed to generate token",
            "details": err
        }), 400

    encoded_token = urllib.parse.quote(token, safe="")
    login_url = f"https://www.netflix.com/youraccount?nftoken={encoded_token}"
    browse_url = f"https://www.netflix.com/browse?nftoken={encoded_token}"
    tv_activation_url = f"https://www.netflix.com/tv8?nftoken={encoded_token}"
    unsupported_url = f"https://www.netflix.com/unsupported?nftoken={encoded_token}"
    direct_tv_url = "https://www.netflix.com/tv8"

    formatted_expires = "Unknown"
    if isinstance(expires, (int, float)):
        try:
            formatted_expires = datetime.fromtimestamp(expires).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            formatted_expires = str(expires)

    login_qr = generate_qr_base64(login_url)
    tv_qr = generate_qr_base64(tv_activation_url)
    unsupported_qr = generate_qr_base64(unsupported_url)

    result_payload = {
        "success": True,
        "token": token,
        "login_url": login_url,
        "browse_url": browse_url,
        "tv_activation_url": tv_activation_url,
        "unsupported_url": unsupported_url,
        "direct_tv_url": direct_tv_url,
        "expires_timestamp": expires,
        "expires_formatted": formatted_expires,
        "login_qr": login_qr,
        "tv_qr": tv_qr,
        "unsupported_qr": unsupported_qr,
        "cookie_info": {
            "format": detect_cookie_format(raw_cookie),
            "keys": list(cookie_dict.keys()),
        },
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    save_history_item({
        "token_preview": token[:18] + "..." if len(token) > 18 else token,
        "full_token": token,
        "login_url": login_url,
        "tv_activation_url": tv_activation_url,
        "expires_formatted": formatted_expires,
        "account_name": "كوكيز مخصص",
        "created_at": result_payload["created_at"],
    })

    result_payload["device_quota"] = {
        "limit": "unlimited",
        "used": 0,
        "remaining": "unlimited"
    }

    resp = jsonify(result_payload)
    tc_val, tc_new = get_or_create_tracking_cookie()
    if tc_new:
        resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
    return resp


@app.route("/api/activate-tv", methods=["POST"])
def activate_tv():
    auth = request.headers.get("Authorization", "").replace("Bearer ", "")
    is_admin = verify_admin_token(auth)
    bucket_id = None

    ip = get_client_ip()
    if not check_rate_limit(ip, "/api/activate-tv", max_requests=25, window=60):
        return jsonify({
            "success": False,
            "error": "Rate limit exceeded. Please wait one minute."
        }), 429

    data = request.get_json(silent=True) or {}
    tv_code = data.get("code", "").strip().replace("-", "").replace(" ", "").upper()
    token = data.get("token", "").strip()

    # Check Private Access Key Gate
    if not is_admin and is_key_required():
        req_key = get_request_access_key()
        valid_key, key_info, key_err = verify_access_key(req_key, increment_use=(token == ""))
        if not valid_key:
            return jsonify({
                "success": False,
                "key_required": True,
                "error": key_err or "Access key is required or invalid."
            }), 401

    if not tv_code or not re.match(r'^[A-Za-z0-9]{8}$', tv_code):
        return jsonify({
            "success": False,
            "error": "Please enter a valid 8-character alphanumeric activation code."
        }), 400

    formatted_code = f"{tv_code[:4]}-{tv_code[4:]}" if len(tv_code) >= 8 else tv_code

    if token:
        encoded_token = urllib.parse.quote(token, safe="")
        auto_activate_url = f"https://www.netflix.com/tv8?nftoken={encoded_token}"
        direct_tv_link = "https://www.netflix.com/tv8"
    else:
        auto_activate_url = "https://www.netflix.com/tv8"
        direct_tv_link = "https://www.netflix.com/tv8"

    tv_qr = generate_qr_base64(auto_activate_url)

    resp = jsonify({
        "success": True,
        "code": formatted_code,
        "auto_activate_url": auto_activate_url,
        "direct_tv_link": direct_tv_link,
        "tv_qr": tv_qr,
        "message": "Open the activation link to sign in automatically and enter your TV screen code directly.",
    })
    tc_val, tc_new = get_or_create_tracking_cookie()
    if tc_new:
        resp.set_cookie("_nftrack", tc_val, max_age=365*86400, httponly=True, samesite="Lax", secure=request.is_secure)
    return resp


@app.route("/api/qr", methods=["GET"])
def get_qr_image():
    ip = get_client_ip()
    if not check_rate_limit(ip, "/api/qr", max_requests=30, window=60):
        return jsonify({"success": False, "error": "Rate limit exceeded"}), 429

    data = sanitize_input(request.args.get("data", ""), max_length=2000).strip()
    if not data:
        return jsonify({"success": False, "error": "Missing data parameter"}), 400
    # Only allow QR generation for known safe URL patterns
    if not data.startswith("https://www.netflix.com/") and not data.startswith("https://netflix.com/"):
        return jsonify({"success": False, "error": "Invalid data for QR generation"}), 400
    try:
        qr_img = generate_qr_base64(data)
        return jsonify({"success": True, "qr": qr_img})
    except Exception:
        return jsonify({"success": False, "error": "QR generation failed"}), 500


# -------------------------------------------------------------
# Admin API Endpoints
# -------------------------------------------------------------
@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    ip = get_client_ip()
    allowed, remaining = check_login_lockout(ip)
    if not allowed:
        return jsonify({
            "success": False,
            "error": f"تم حظر المحاولات مؤقتاً لحماية الموقع بسبب تكرار الخطأ. يرجى الانتظار {remaining // 60 + 1} دقيقة."
        }), 429

    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "يرجى إدخال اسم المستخدم وكلمة المرور"}), 400

    valid_user = get_admin_username()
    # Constant-time comparison for username against timing attacks
    user_match = secrets.compare_digest(username.lower(), valid_user.lower())
    pass_match = check_admin_password(password)

    if user_match and pass_match:
        record_login_success(ip)
        token = create_admin_session(valid_user, ip)
        return jsonify({
            "success": True,
            "token": token,
            "username": valid_user,
            "message": "تم تسجيل دخول المشرف بنجاح"
        })

    locked = record_login_failure(ip)
    if locked:
        return jsonify({
            "success": False,
            "error": "تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم حظر الـ IP لمدة 15 دقيقة لحماية اللوحة."
        }), 429

    return jsonify({
        "success": False,
        "error": "اسم المستخدم أو كلمة المرور غير صحيحة"
    }), 401


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    auth = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if auth:
        sessions = load_admin_sessions()
        if auth in sessions:
            sessions.pop(auth, None)
            save_admin_sessions(sessions)
    return jsonify({"success": True, "message": "تم إنهاء الجلسة بنجاح"})


@app.route("/api/admin/cookies", methods=["GET"])
@require_admin
def admin_get_cookies():
    pool = load_pool()
    safe_pool = []
    active_count = 0

    for c in pool:
        status = c.get("status", "active")
        if status == "active":
            active_count += 1
        safe_copy = {
            "id": c.get("id"),
            "name": c.get("name"),
            "netflix_id_preview": c.get("netflix_id_preview"),
            "format": c.get("format"),
            "status": status,
            "usage_count": c.get("usage_count", 0),
            "added_at": c.get("added_at"),
            "last_used": c.get("last_used"),
            "last_status": c.get("last_status"),
            "raw_length": len(c.get("raw", "")),
        }
        safe_pool.append(safe_copy)

    return jsonify({
        "success": True,
        "cookies": safe_pool,
        "total": len(pool),
        "active": active_count
    })


@app.route("/api/admin/cookies/add", methods=["POST"])
@require_admin
def admin_add_cookies():
    data = request.get_json(silent=True) or {}
    raw_input = sanitize_input(data.get("cookies_text", ""), max_length=100000).strip()
    base_name = sanitize_input(data.get("name", ""), max_length=100).strip() or "حساب نتفلكس"

    if not raw_input:
        return jsonify({"success": False, "error": "يرجى إدخال نص الكوكيز"}), 400

    pool = load_pool()

    # Split by delimiter if user pasted multiple cookies (e.g., separated by '---' or lines of JSON)
    chunks = re.split(r"\n\s*---\s*\n|\n\s*===\s*\n", raw_input)
    if len(chunks) == 1 and raw_input.startswith("[") and raw_input.endswith("]"):
        try:
            parsed_json = json.loads(raw_input)
            if isinstance(parsed_json, list) and len(parsed_json) > 0 and isinstance(parsed_json[0], list):
                chunks = [json.dumps(sub) for sub in parsed_json]
        except Exception:
            pass

    added_count = 0
    errors = []

    for idx, chunk in enumerate(chunks, 1):
        clean_chunk = chunk.strip()
        if not clean_chunk:
            continue
        cd = extract_cookie_dict(clean_chunk)
        if not cd or REQUIRED_COOKIE not in cd:
            errors.append(f"القطعة #{idx}: لم يتم العثور على NetflixId صالح.")
            continue

        item_name = f"{base_name} #{len(pool) + 1}" if len(chunks) > 1 else base_name
        new_item = {
            "id": f"ck_{uuid.uuid4().hex[:8]}",
            "name": item_name,
            "raw": clean_chunk,
            "netflix_id_preview": cd["NetflixId"][:15] + "...",
            "format": detect_cookie_format(clean_chunk),
            "status": "active",
            "usage_count": 0,
            "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_used": None,
            "last_status": "new",
        }
        pool.append(new_item)
        added_count += 1

    save_pool(pool)

    return jsonify({
        "success": added_count > 0,
        "added_count": added_count,
        "errors": errors,
        "message": f"تمت إضافة {added_count} كوكيز بنجاح إلى المستودع"
    })


@app.route("/api/admin/cookies/delete", methods=["POST"])
@require_admin
def admin_delete_cookie():

    data = request.get_json(silent=True) or {}
    cookie_id = data.get("id")

    pool = load_pool()
    new_pool = [c for c in pool if c.get("id") != cookie_id]
    save_pool(new_pool)

    return jsonify({"success": True, "message": "تم حذف الكوكيز بنجاح"})


@app.route("/api/admin/cookies/toggle", methods=["POST"])
@require_admin
def admin_toggle_cookie():

    data = request.get_json(silent=True) or {}
    cookie_id = data.get("id")

    pool = load_pool()
    for c in pool:
        if c.get("id") == cookie_id:
            c["status"] = "inactive" if c.get("status") == "active" else "active"
            save_pool(pool)
            return jsonify({"success": True, "status": c["status"]})

    return jsonify({"success": False, "error": "الكوكيز غير موجود"}), 404


@app.route("/api/admin/cookies/test", methods=["POST"])
@require_admin
def admin_test_cookie():

    data = request.get_json(silent=True) or {}
    cookie_id = data.get("id")

    pool = load_pool()
    target = next((c for c in pool if c.get("id") == cookie_id), None)
    if not target:
        return jsonify({"success": False, "error": "الكوكيز غير موجود"}), 404

    cd = extract_cookie_dict(target.get("raw", ""))
    token, expires, err = fetch_nftoken_api(cd)

    if err or not token:
        target["last_status"] = "error"
        if "expired" in str(err).lower() or "no token found" in str(err).lower():
            target["status"] = "expired"
        save_pool(pool)
        return jsonify({"success": False, "error": err or "فحص فاشل"})

    target["last_status"] = "valid"
    target["status"] = "active"
    save_pool(pool)
    return jsonify({
        "success": True,
        "token_preview": token[:15] + "...",
        "expires": expires,
        "message": "الكوكيز صالح ويعمل بنجاح!"
    })


@app.route("/api/admin/cookies/generate-mobile-link", methods=["POST"])
@app.route("/api/admin/cookies/mobile-link", methods=["POST"])
@require_admin
def admin_generate_mobile_link():
    data = request.get_json(silent=True) or {}
    cookie_id = data.get("id")

    if not cookie_id:
        return jsonify({"success": False, "error": "معرف الحساب مطلوب"}), 400

    pool = load_pool()
    target = next((c for c in pool if c.get("id") == cookie_id), None)
    if not target:
        return jsonify({"success": False, "error": "الحساب غير موجود في المجمع"}), 404

    cd = extract_cookie_dict(target.get("raw", ""))
    token, expires, err = fetch_nftoken_api(cd)

    if err or not token:
        target["last_status"] = "error"
        if "expired" in str(err).lower() or "no token found" in str(err).lower():
            target["status"] = "expired"
        save_pool(pool)
        return jsonify({"success": False, "error": err or "فشل إنتاج رابط التفعيل - قد يكون الكوكيز منتهي الصلاحية"})

    target["last_status"] = "valid"
    target["status"] = "active"
    save_pool(pool)

    encoded_token = urllib.parse.quote(token, safe="")
    mobile_url = f"https://www.netflix.com/unsupported?nftoken={encoded_token}"
    login_url = f"https://www.netflix.com/youraccount?nftoken={encoded_token}"
    tv_url = f"https://www.netflix.com/tv8?nftoken={encoded_token}"

    try:
        mobile_qr = generate_qr_base64(mobile_url)
    except Exception:
        mobile_qr = ""

    return jsonify({
        "success": True,
        "mobile_url": mobile_url,
        "login_url": login_url,
        "tv_url": tv_url,
        "mobile_qr": mobile_qr,
        "token": token,
        "account_name": target.get("name") or "حساب نتفلكس",
        "message": "تم إنتاج رابط تفعيل الهاتف بنجاح!"
    })


@app.route("/api/admin/cookies/clear", methods=["POST"])
@require_admin
def admin_clear_all():
    save_pool([])
    return jsonify({"success": True, "message": "تم مسح جميع الكوكيز بنجاح"})


@app.route("/api/admin/cookies/import-input", methods=["POST"])
@require_admin
def admin_import_from_input():
    if not os.path.exists(INPUT_FILE):
        return jsonify({"success": False, "error": "ملف input.txt غير موجود"}), 404

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    cd = extract_cookie_dict(content)
    if not cd or REQUIRED_COOKIE not in cd:
        return jsonify({"success": False, "error": "محتوى input.txt لا يحتوي على NetflixId صالح"}), 400

    pool = load_pool()
    new_item = {
        "id": f"ck_{uuid.uuid4().hex[:8]}",
        "name": f"كوكيز من input.txt (#{len(pool) + 1})",
        "raw": content,
        "netflix_id_preview": cd["NetflixId"][:15] + "...",
        "format": detect_cookie_format(content),
        "status": "active",
        "usage_count": 0,
        "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "last_used": None,
        "last_status": "new",
    }
    pool.append(new_item)
    save_pool(pool)

    return jsonify({"success": True, "message": "تم استيراد الكوكيز بنجاح إلى المستودع"})


@app.route("/api/admin/change-password", methods=["POST"])
@require_admin
def admin_change_password():

    data = request.get_json(silent=True) or {}
    new_pass = sanitize_input(data.get("new_password", ""), max_length=128).strip()
    if not new_pass or len(new_pass) < 8:
        return jsonify({"success": False, "error": "يجب أن تكون كلمة المرور 8 أحرف على الأقل"}), 400

    if set_admin_credentials(get_admin_username(), new_pass):
        ip = get_client_ip()
        new_token = create_admin_session(get_admin_username(), ip)
        return jsonify({"success": True, "token": new_token, "message": "تم تحديث كلمة المرور بنجاح"})
    return jsonify({"success": False, "error": "تعذر حفظ كلمة المرور"}), 500


@app.route("/api/admin/change-credentials", methods=["POST"])
@require_admin
def admin_change_credentials():

    data = request.get_json(silent=True) or {}
    new_user = sanitize_input(data.get("new_username", ""), max_length=64).strip() or get_admin_username()
    new_pass = sanitize_input(data.get("new_password", ""), max_length=128).strip()

    # Validate username: alphanumeric + underscore only
    if not re.match(r'^[a-zA-Z0-9_]+$', new_user) or len(new_user) < 3:
        return jsonify({"success": False, "error": "اسم المستخدم يجب أن يكون 3 أحرف على الأقل ويحتوي على أحرف وأرقام فقط"}), 400
    if not new_pass or len(new_pass) < 8:
        return jsonify({"success": False, "error": "كلمة المرور يجب أن تكون 8 أحرف على الأقل"}), 400

    if set_admin_credentials(new_user, new_pass):
        ip = get_client_ip()
        new_token = create_admin_session(new_user, ip)
        return jsonify({
            "success": True,
            "token": new_token,
            "username": new_user,
            "message": "تم تحديث بيانات تسجيل الدخول بنجاح"
        })
    return jsonify({"success": False, "error": "تعذر حفظ البيانات"}), 500


@app.route("/api/admin/cookies/get-raw", methods=["POST"])
@require_admin
def admin_get_cookie_raw():

    data = request.get_json(silent=True) or {}
    cookie_id = data.get("id")
    pool = load_pool()
    target = next((c for c in pool if c.get("id") == cookie_id), None)
    if not target:
        return jsonify({"success": False, "error": "الكوكيز غير موجود"}), 404

    return jsonify({"success": True, "raw": target.get("raw", ""), "name": target.get("name", "")})


@app.route("/api/admin/cookies/test-all", methods=["POST"])
@require_admin
def admin_test_all_cookies():

    pool = load_pool()
    valid_count = 0
    expired_count = 0
    total = len(pool)

    for target in pool:
        try:
            cd = extract_cookie_dict(target.get("raw", ""))
            token, expires, err = fetch_nftoken_api(cd)
            if err or not token:
                target["last_status"] = "error"
                if "expired" in str(err).lower() or "no token found" in str(err).lower():
                    target["status"] = "expired"
                expired_count += 1
            else:
                target["last_status"] = "valid"
                target["status"] = "active"
                valid_count += 1
        except Exception:
            expired_count += 1

    save_pool(pool)
    return jsonify({
        "success": True,
        "total": total,
        "valid_count": valid_count,
        "expired_count": expired_count,
        "message": f"اكتمل الفحص: {valid_count} نشط / {expired_count} منتهي أو به خطأ"
    })


@app.route("/api/admin/cookies/bulk", methods=["POST"])
@require_admin
def admin_bulk_action():

    data = request.get_json(silent=True) or {}
    action = data.get("action")
    ids = set(data.get("ids", []))

    if not ids:
        return jsonify({"success": False, "error": "لم يتم تحديد أي حسابات"}), 400

    pool = load_pool()
    if action == "delete":
        pool = [c for c in pool if c.get("id") not in ids]
        save_pool(pool)
        return jsonify({"success": True, "message": f"تم حذف {len(ids)} حساب بنجاح"})
    elif action == "activate":
        count = 0
        for c in pool:
            if c.get("id") in ids:
                c["status"] = "active"
                count += 1
        save_pool(pool)
        return jsonify({"success": True, "message": f"تم تفعيل {count} حساب"})
    elif action == "deactivate":
        count = 0
        for c in pool:
            if c.get("id") in ids:
                c["status"] = "inactive"
                count += 1
        save_pool(pool)
        return jsonify({"success": True, "message": f"تم تعطيل {count} حساب"})


@app.route("/api/admin/cookies/export", methods=["GET"])
@require_admin
def admin_export_cookies():

    pool = load_pool()
    return jsonify({
        "success": True,
        "exported_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(pool),
        "pool": pool
    })


@app.route("/api/admin/system-info", methods=["GET"])
@require_admin
def admin_system_info():

    uptime_delta = datetime.now() - SERVER_START_TIME
    hours, remainder = divmod(int(uptime_delta.total_seconds()), 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime_str = f"{hours}h {minutes}m {seconds}s"

    pool = load_pool()
    active_count = sum(1 for c in pool if c.get("status") == "active")

    device_limits = load_device_limits()
    keys_data = load_access_keys()
    keys_list = list(keys_data.get("keys", {}).values())

    return jsonify({
        "success": True,
        "uptime": uptime_str,
        "admin_username": get_admin_username(),
        "total_cookies": len(pool),
        "active_cookies": active_count,
        "today_active_devices": len(device_limits),
        "total_keys": len(keys_list),
        "active_keys": sum(1 for k in keys_list if k.get("status") == "active"),
        "key_system_required": bool(keys_data.get("settings", {}).get("require_key", True)),
        "python_version": "3.13.5",
        "server_status": "Online",
        "is_vercel": IS_VERCEL,
        "environment": "Vercel Serverless" if IS_VERCEL else "Standalone Python",
        "storage_mode": "Cloud Serverless (/tmp + Env Sync)" if IS_VERCEL else "Local Filesystem",
        "started_at": SERVER_START_TIME.strftime("%Y-%m-%d %H:%M:%S")
    })


@app.route("/api/admin/vercel-env", methods=["GET"])
@require_admin
def admin_export_vercel_env():
    """Export current cookies, keys, and admin configuration formatted for Vercel Environment Variables."""
    pool = load_pool()
    keys = load_access_keys()
    admin = get_admin_config()

    cookies_json = json.dumps(pool, ensure_ascii=False)
    keys_json = json.dumps(keys, ensure_ascii=False)
    admin_json = json.dumps({"username": admin.get("username"), "password_hash": admin.get("password_hash")}, ensure_ascii=False)

    return jsonify({
        "success": True,
        "is_vercel": IS_VERCEL,
        "env_vars": {
            "COOKIES_POOL_DATA": cookies_json,
            "ACCESS_KEYS_DATA": keys_json,
            "ADMIN_CONFIG_DATA": admin_json,
            "FLASK_SECRET_KEY": SECRET_KEY_VALUE
        }
    })


@app.route("/api/admin/reset-device-limits", methods=["POST"])
@require_admin
def admin_reset_device_limits():
    save_device_limits({})
    return jsonify({"success": True, "message": "تم تصفير حدود الأجهزة لليوم بنجاح (3 تفعيلات متاحة لكل جهاز الآن)"})


# -------------------------------------------------------------
# Admin Access Key Management Endpoints
# -------------------------------------------------------------
@app.route("/api/admin/keys", methods=["GET"])
@require_admin
def admin_get_keys():
    data = load_access_keys()
    keys_dict = data.get("keys", {})
    require_key = data.get("settings", {}).get("require_key", True)

    keys_list = list(keys_dict.values())
    keys_list.sort(key=lambda k: k.get("created_at", ""), reverse=True)

    now = datetime.now()
    changed = False
    for k in keys_list:
        if k.get("status") == "active":
            exp_str = k.get("expires_at")
            if exp_str:
                try:
                    exp_dt = datetime.strptime(exp_str, "%Y-%m-%d %H:%M:%S")
                    if now > exp_dt:
                        k["status"] = "expired"
                        changed = True
                except Exception:
                    pass
            max_u = k.get("max_uses")
            if max_u is not None:
                try:
                    if int(max_u) > 0 and k.get("used_count", 0) >= int(max_u):
                        k["status"] = "exhausted"
                        changed = True
                except Exception:
                    pass
    if changed:
        save_access_keys(data)

    total_keys = len(keys_list)
    active_keys = sum(1 for k in keys_list if k.get("status") == "active")
    total_uses = sum(k.get("used_count", 0) for k in keys_list)

    return jsonify({
        "success": True,
        "require_key": require_key,
        "total_keys": total_keys,
        "active_keys": active_keys,
        "total_uses": total_uses,
        "keys": keys_list
    })


@app.route("/api/admin/keys/create", methods=["POST"])
@require_admin
def admin_create_key():
    req_data = request.get_json(silent=True) or {}
    label = sanitize_input(req_data.get("label", ""), max_length=100).strip() or "مستخدم عام"
    expires_type = req_data.get("expires_type", "never").strip()
    custom_expires = req_data.get("custom_expires", "").strip()
    max_uses_raw = req_data.get("max_uses")
    custom_key_raw = sanitize_input(req_data.get("custom_key", ""), max_length=40).strip()

    try:
        count = min(max(1, int(req_data.get("count", 1))), 50)
    except Exception:
        count = 1

    # Determine expires_at string
    expires_at = None
    now = datetime.now()
    if expires_type == "24h":
        expires_at = (now + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "3d":
        expires_at = (now + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "7d":
        expires_at = (now + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "30d":
        expires_at = (now + timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "90d":
        expires_at = (now + timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "1y":
        expires_at = (now + timedelta(days=365)).strftime("%Y-%m-%d %H:%M:%S")
    elif expires_type == "custom" and custom_expires:
        try:
            if len(custom_expires) == 10:
                dt = datetime.strptime(custom_expires, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            else:
                dt = datetime.strptime(custom_expires, "%Y-%m-%d %H:%M:%S")
            expires_at = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            expires_at = None

    # Determine max_uses
    max_uses = None
    if max_uses_raw is not None and str(max_uses_raw).strip() not in ("", "unlimited", "0"):
        try:
            val = int(max_uses_raw)
            if val > 0:
                max_uses = val
        except Exception:
            max_uses = None

    data = load_access_keys()
    keys_dict = data.setdefault("keys", {})
    created_keys = []

    for i in range(count):
        if count == 1 and custom_key_raw:
            clean_k = custom_key_raw.upper().replace(" ", "")
            if not clean_k.startswith("NF-"):
                clean_k = f"NF-{clean_k}"
            key_id = clean_k
        else:
            key_id = generate_key_string()
            while key_id in keys_dict:
                key_id = generate_key_string()

        key_label = label if count == 1 else f"{label} #{i+1}"
        new_key_item = {
            "key": key_id,
            "label": key_label,
            "type": "standard",
            "status": "active",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "expires_at": expires_at,
            "max_uses": max_uses,
            "used_count": 0,
            "devices": [],
            "last_used_at": None,
            "last_ip": None
        }
        keys_dict[key_id] = new_key_item
        created_keys.append(new_key_item)

    save_access_keys(data)
    return jsonify({
        "success": True,
        "message": f"تم إنشاء {len(created_keys)} مفتاح دخول بنجاح",
        "created_keys": created_keys
    })


@app.route("/api/admin/keys/toggle", methods=["POST"])
@require_admin
def admin_toggle_key():
    req_data = request.get_json(silent=True) or {}
    key_id = req_data.get("key", "").strip()
    data = load_access_keys()
    keys_dict = data.get("keys", {})

    target_k = None
    for k in keys_dict:
        if k.upper() == key_id.upper():
            target_k = k
            break

    if not target_k:
        return jsonify({"success": False, "error": "المفتاح غير موجود"}), 404

    current_status = keys_dict[target_k].get("status", "active")
    new_status = "revoked" if current_status == "active" else "active"
    keys_dict[target_k]["status"] = new_status
    save_access_keys(data)

    msg = "تم إيقاف المفتاح بنجاح" if new_status == "revoked" else "تم إعادة تفعيل المفتاح بنجاح"
    return jsonify({"success": True, "status": new_status, "message": msg})


@app.route("/api/admin/keys/delete", methods=["POST"])
@require_admin
def admin_delete_key():
    req_data = request.get_json(silent=True) or {}
    key_id = req_data.get("key", "").strip()
    data = load_access_keys()
    keys_dict = data.get("keys", {})

    target_k = None
    for k in keys_dict:
        if k.upper() == key_id.upper():
            target_k = k
            break

    if not target_k:
        return jsonify({"success": False, "error": "المفتاح غير موجود"}), 404

    keys_dict.pop(target_k, None)
    save_access_keys(data)
    return jsonify({"success": True, "message": "تم حذف المفتاح بنجاح"})


@app.route("/api/admin/keys/reset-usage", methods=["POST"])
@require_admin
def admin_reset_key_usage():
    req_data = request.get_json(silent=True) or {}
    key_id = req_data.get("key", "").strip()
    data = load_access_keys()
    keys_dict = data.get("keys", {})

    target_k = None
    for k in keys_dict:
        if k.upper() == key_id.upper():
            target_k = k
            break

    if not target_k:
        return jsonify({"success": False, "error": "المفتاح غير موجود"}), 404

    keys_dict[target_k]["used_count"] = 0
    if keys_dict[target_k].get("status") == "exhausted":
        keys_dict[target_k]["status"] = "active"
    save_access_keys(data)
    return jsonify({"success": True, "message": "تم تصفير عداد استخدامات المفتاح بنجاح"})


@app.route("/api/admin/keys/toggle-requirement", methods=["POST"])
@require_admin
def admin_toggle_requirement():
    req_data = request.get_json(silent=True) or {}
    require_key = bool(req_data.get("require_key", True))
    data = load_access_keys()
    data.setdefault("settings", {})["require_key"] = require_key
    save_access_keys(data)

    status_str = "مفعّل (الموقع محمي بمفتاح دخول)" if require_key else "معطّل (الموقع متاح للجميع)"
    return jsonify({"success": True, "require_key": require_key, "message": f"نظام المفاتيح الآن {status_str}"})


@app.route("/api/admin/keys/delete-expired", methods=["POST"])
@require_admin
def admin_delete_expired_keys():
    data = load_access_keys()
    keys_dict = data.get("keys", {})
    now = datetime.now()
    to_delete = []

    for k, info in keys_dict.items():
        if info.get("status") in ("expired", "exhausted"):
            to_delete.append(k)
            continue
        exp_str = info.get("expires_at")
        if exp_str:
            try:
                exp_dt = datetime.strptime(exp_str, "%Y-%m-%d %H:%M:%S")
                if now > exp_dt:
                    to_delete.append(k)
            except Exception:
                pass

    for k in to_delete:
        keys_dict.pop(k, None)

    save_access_keys(data)
    return jsonify({"success": True, "deleted_count": len(to_delete), "message": f"تم تنظيف {len(to_delete)} مفتاح منتهي الصلاحية"})




@app.route("/api/history", methods=["GET"])
@require_admin
def get_history():
    return jsonify({"success": True, "history": load_history()})



# Custom error handlers to prevent information leakage
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({
            "success": False,
            "error": "Resource not found",
            "debug": {
                "request_path": request.path,
                "environ_path_info": request.environ.get("PATH_INFO"),
                "headers": dict(request.headers),
                "environ_matches": [f"{k}={v}" for k, v in request.environ.items() if any(x in k for x in ("PATH", "URI", "VERCEL", "ROUTE"))]
            }
        }), 404
    return render_template("index.html"), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed"}), 405


@app.errorhandler(413)
def request_too_large(e):
    return jsonify({"success": False, "error": "Request entity too large"}), 413


@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"success": False, "error": "Too many requests"}), 429


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


def get_local_network_ip():
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        return "127.0.0.1"





if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    lan_ip = get_local_network_ip()
    print("=" * 60)
    print("🚀 XNetflix Studio Web App is running:")
    print(f"   🏠 Local (هذا الجهاز):       http://127.0.0.1:{port}")
    print(f"   🌐 Network (الشبكة المحلية): http://{lan_ip}:{port}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)

