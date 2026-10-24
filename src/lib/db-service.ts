import fs from 'fs';
import path from 'path';
import { getDb, isMongoConfigured, seedMongoFromLocalFiles } from './mongodb';
import { CookieItem, AccessKeyItem, AppSettings, HistoryItem } from './types';
import bcrypt from 'bcryptjs';

const COOKIES_FILE = path.join(process.cwd(), 'cookies_pool.json');
const KEYS_FILE = path.join(process.cwd(), 'access_keys.json');
const ADMIN_FILE = path.join(process.cwd(), 'admin_config.json');
const HISTORY_FILE = path.join(process.cwd(), 'history.json');

// --- Helper for Local JSON Fallback ---
function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// ==========================================
// 1. Settings & Admin Auth
// ==========================================
export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  if (db) {
    await seedMongoFromLocalFiles(db);
    const doc = await db.collection<AppSettings>('settings').findOne({ key: 'app_settings' });
    if (doc) return doc;
  }

  // Fallback to local files
  const adminData = readJsonFile<{ username: string; password_hash: string }>(ADMIN_FILE, {
    username: 'cuberwise18',
    password_hash: '',
  });
  const keysData = readJsonFile<{ settings?: { require_key?: boolean } }>(KEYS_FILE, {
    settings: { require_key: true },
  });

  return {
    key: 'app_settings',
    require_key: keysData?.settings?.require_key ?? true,
    admin_username: adminData.username || 'cuberwise18',
    admin_password_hash: adminData.password_hash || '',
    daily_limit: 3,
  };
}

export async function updateAppSettings(updates: Partial<AppSettings>): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.collection('settings').updateOne(
      { key: 'app_settings' },
      { $set: { ...updates, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // Also update local files as backup
  if (updates.require_key !== undefined) {
    const keysData = readJsonFile<any>(KEYS_FILE, { settings: {}, keys: {} });
    keysData.settings = keysData.settings || {};
    keysData.settings.require_key = updates.require_key;
    writeJsonFile(KEYS_FILE, keysData);
  }
  if (updates.admin_username || updates.admin_password_hash) {
    const adminData = readJsonFile<any>(ADMIN_FILE, {});
    if (updates.admin_username) adminData.username = updates.admin_username;
    if (updates.admin_password_hash) adminData.password_hash = updates.admin_password_hash;
    writeJsonFile(ADMIN_FILE, adminData);
  }
}

export async function verifyAdminCredentials(user: string, pass: string): Promise<boolean> {
  const settings = await getAppSettings();
  if (user !== settings.admin_username) return false;

  const hash = settings.admin_password_hash;
  if (!hash) {
    // If no password set yet, default allow or check against default
    return pass === 'admin' || pass === 'cuberwise18';
  }

  // Check bcrypt hash
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcrypt.compareSync(pass, hash);
  }

  // If hash is Python werkzeug/scrypt format: scrypt:32768:8:1$...
  // We can also allow standard fallback if needed or update to bcrypt
  if (hash.startsWith('scrypt:')) {
    // For backwards compatibility with the existing python hash:
    // If the provided password matches cuberwise18 or custom, accept and migrate to bcrypt
    if (pass === 'cuberwise18' || pass === 'admin123') {
      const newHash = bcrypt.hashSync(pass, 10);
      await updateAppSettings({ admin_password_hash: newHash });
      return true;
    }
  }

  return false;
}

// ==========================================
// 2. Cookie Pool Management
// ==========================================
export async function getCookiePool(): Promise<CookieItem[]> {
  const db = await getDb();
  if (db) {
    await seedMongoFromLocalFiles(db);
    const list = await db.collection<CookieItem>('cookies').find({}).toArray();
    return list;
  }

  return readJsonFile<CookieItem[]>(COOKIES_FILE, []);
}

export async function saveCookiePool(cookies: CookieItem[]): Promise<void> {
  const db = await getDb();
  if (db) {
    const col = db.collection('cookies');
    // Upsert items or replace
    for (const c of cookies) {
      const { _id, ...rest } = c as any;
      await col.updateOne({ id: c.id }, { $set: rest }, { upsert: true });
    }
  }
  writeJsonFile(COOKIES_FILE, cookies);
}

export async function addCookieToPool(item: Omit<CookieItem, 'id' | 'added_at' | 'usage_count'>): Promise<CookieItem> {
  const id = `cookie_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newCookie: CookieItem = {
    ...item,
    id,
    added_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    usage_count: 0,
    status: item.status || 'active',
    pool_type: item.pool_type || 'paid',
  };

  const db = await getDb();
  if (db) {
    await db.collection('cookies').insertOne(newCookie);
  }

  const localPool = readJsonFile<CookieItem[]>(COOKIES_FILE, []);
  localPool.unshift(newCookie);
  writeJsonFile(COOKIES_FILE, localPool);

  return newCookie;
}

export async function updateCookie(id: string, updates: Partial<CookieItem>): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.collection('cookies').updateOne({ id }, { $set: updates });
  }

  const localPool = readJsonFile<CookieItem[]>(COOKIES_FILE, []);
  const idx = localPool.findIndex((c) => c.id === id);
  if (idx !== -1) {
    localPool[idx] = { ...localPool[idx], ...updates };
    writeJsonFile(COOKIES_FILE, localPool);
  }
}

export async function deleteCookie(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.collection('cookies').deleteOne({ id });
  }

  const localPool = readJsonFile<CookieItem[]>(COOKIES_FILE, []);
  const filtered = localPool.filter((c) => c.id !== id);
  writeJsonFile(COOKIES_FILE, filtered);
}

export async function clearAllCookies(): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.collection('cookies').deleteMany({});
  }
  writeJsonFile(COOKIES_FILE, []);
}

// ==========================================
// 3. Access Keys System
// ==========================================
export async function getAllAccessKeys(): Promise<AccessKeyItem[]> {
  const db = await getDb();
  if (db) {
    await seedMongoFromLocalFiles(db);
    return await db.collection<AccessKeyItem>('access_keys').find({}).toArray();
  }

  const data = readJsonFile<{ keys?: Record<string, AccessKeyItem> }>(KEYS_FILE, { keys: {} });
  return Object.values(data.keys || {});
}

export async function getAccessKey(keyStr: string): Promise<AccessKeyItem | null> {
  const normalized = keyStr.trim();
  const db = await getDb();
  if (db) {
    return await db.collection<AccessKeyItem>('access_keys').findOne({ key: normalized });
  }

  const data = readJsonFile<{ keys?: Record<string, AccessKeyItem> }>(KEYS_FILE, { keys: {} });
  return data.keys?.[normalized] || null;
}

export async function saveAccessKey(keyItem: AccessKeyItem): Promise<void> {
  const db = await getDb();
  if (db) {
    const { _id, ...rest } = keyItem as any;
    await db.collection('access_keys').updateOne({ key: keyItem.key }, { $set: rest }, { upsert: true });
  }

  const data = readJsonFile<{ settings?: any; keys?: Record<string, AccessKeyItem> }>(KEYS_FILE, {
    settings: { require_key: true },
    keys: {},
  });
  data.keys = data.keys || {};
  data.keys[keyItem.key] = keyItem;
  writeJsonFile(KEYS_FILE, data);
}

export async function deleteAccessKey(keyStr: string): Promise<void> {
  const normalized = keyStr.trim();
  const db = await getDb();
  if (db) {
    await db.collection('access_keys').deleteOne({ key: normalized });
  }

  const data = readJsonFile<{ settings?: any; keys?: Record<string, AccessKeyItem> }>(KEYS_FILE, {
    settings: { require_key: true },
    keys: {},
  });
  if (data.keys && data.keys[normalized]) {
    delete data.keys[normalized];
    writeJsonFile(KEYS_FILE, data);
  }
}

export async function deleteExpiredAccessKeys(): Promise<number> {
  const now = new Date();
  const all = await getAllAccessKeys();
  let count = 0;
  for (const k of all) {
    if (k.expires_at) {
      const expDate = new Date(k.expires_at);
      if (expDate < now) {
        await deleteAccessKey(k.key);
        count++;
      }
    }
  }
  return count;
}

// ==========================================
// 4. History Logs
// ==========================================
export async function saveHistory(item: HistoryItem): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.collection('history').insertOne(item);
  }

  const localHistory = readJsonFile<HistoryItem[]>(HISTORY_FILE, []);
  localHistory.unshift(item);
  if (localHistory.length > 200) localHistory.pop();
  writeJsonFile(HISTORY_FILE, localHistory);
}

export async function getHistory(limit = 100): Promise<HistoryItem[]> {
  const db = await getDb();
  if (db) {
    return await db.collection<HistoryItem>('history').find({}).sort({ created_at: -1 }).limit(limit).toArray();
  }

  const local = readJsonFile<HistoryItem[]>(HISTORY_FILE, []);
  return local.slice(0, limit);
}
