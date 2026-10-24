import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'netflix_nftoken';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return !!MONGODB_URI && MONGODB_URI.trim().length > 0;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 4000,
          connectTimeoutMS: 4000,
        });
        global._mongoClientPromise = client.connect();
      }
      return await global._mongoClientPromise;
    } else {
      if (!clientPromise) {
        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 4000,
          connectTimeoutMS: 4000,
        });
        clientPromise = client.connect();
      }
      return await clientPromise;
    }
  } catch (err) {
    console.warn('[MongoDB Connection Warning - Falling back to local data]:', (err as any)?.message || err);
    return null;
  }
}

export async function getDb(): Promise<Db | null> {
  try {
    const cli = await getMongoClient();
    if (!cli) return null;
    return cli.db(DB_NAME);
  } catch (err) {
    console.warn('[MongoDB getDb Warning]:', (err as any)?.message || err);
    return null;
  }
}

// Auto-seed existing JSON data into MongoDB if collections are empty
export async function seedMongoFromLocalFiles(db: Db) {
  try {
    const cookiesCol = db.collection('cookies');
    const cookieCount = await cookiesCol.countDocuments().catch(() => -1);
    if (cookieCount === 0) {
      const cookiesPath = path.join(process.cwd(), 'cookies_pool.json');
      if (fs.existsSync(cookiesPath)) {
        const raw = fs.readFileSync(cookiesPath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          await cookiesCol.insertMany(data);
          console.log(`[MongoDB] Seeded ${data.length} cookies from local file.`);
        }
      }
    }

    const keysCol = db.collection('access_keys');
    const keyCount = await keysCol.countDocuments().catch(() => -1);
    if (keyCount === 0) {
      const keysPath = path.join(process.cwd(), 'access_keys.json');
      if (fs.existsSync(keysPath)) {
        const raw = fs.readFileSync(keysPath, 'utf-8');
        const data = JSON.parse(raw);
        const keysArr = Object.values(data.keys || {});
        if (keysArr.length > 0) {
          await keysCol.insertMany(keysArr as any[]);
          console.log(`[MongoDB] Seeded ${keysArr.length} access keys from local file.`);
        }
      }
    }

    const settingsCol = db.collection('settings');
    const settingsDoc = await settingsCol.findOne({ key: 'app_settings' }).catch(() => null);
    
    let adminUser = process.env.ADMIN_USERNAME || 'cuberwise18';
    let adminPassHash = '';
    const adminPath = path.join(process.cwd(), 'admin_config.json');
    if (fs.existsSync(adminPath)) {
      try {
        const raw = fs.readFileSync(adminPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.username) adminUser = data.username;
        if (data.password_hash) adminPassHash = data.password_hash;
      } catch (_) {}
    }

    if (!settingsDoc) {
      await settingsCol.insertOne({
        key: 'app_settings',
        require_key: true,
        admin_username: adminUser,
        admin_password_hash: adminPassHash,
        daily_limit: 3,
        updated_at: new Date().toISOString()
      }).catch(() => {});
      console.log('[MongoDB] Seeded initial app_settings.');
    } else if (settingsDoc.admin_password_hash === '$2a$10$wT8hTqL5jG8oO2mS8h7J1OB8f/R4J9Q7V6wG9Y9C9S5J4K3L2M1O' && adminPassHash) {
      // Auto-repair dummy password hash with real hash from admin_config.json
      await settingsCol.updateOne(
        { key: 'app_settings' },
        { $set: { admin_password_hash: adminPassHash, admin_username: adminUser } }
      ).catch(() => {});
      console.log('[MongoDB] Repaired admin password hash.');
    }
  } catch (err) {
    console.error('[MongoDB Seed Error]', err);
  }
}
