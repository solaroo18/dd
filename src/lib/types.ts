export interface CookieItem {
  _id?: any;
  id: string;
  name: string;
  raw: string;
  netflix_id_preview?: string;
  format?: string;
  status: 'active' | 'invalid' | 'expired' | 'disabled';
  pool_type: 'default' | 'vip' | 'paid' | 'free' | string;
  usage_count: number;
  added_at: string;
  last_used?: string | null;
  last_status?: string;
}

export interface AccessKeyItem {
  _id?: any;
  key: string;
  label: string;
  type: 'standard' | 'vip' | 'custom' | string;
  status: 'active' | 'disabled';
  created_at: string;
  expires_at: string | null; // ISO string or 'YYYY-MM-DD HH:mm:ss'
  max_uses: number | null;
  used_count: number;
  devices: string[];
  last_used_at?: string | null;
  last_ip?: string | null;
}

export interface AppSettings {
  _id?: any;
  key: string;
  require_key: boolean;
  admin_username: string;
  admin_password_hash: string;
  daily_limit?: number;
}

export interface HistoryItem {
  _id?: any;
  token_preview: string;
  full_token: string;
  login_url: string;
  tv_activation_url: string;
  expires_formatted: string;
  account_name: string;
  created_at: string;
}

export interface DeviceSession {
  _id?: any;
  deviceId: string;
  assigned_cookie_id?: string;
  payload?: any;
  expires_timestamp?: number;
  used_today: number;
  last_date: string;
}
