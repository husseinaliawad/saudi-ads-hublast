import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'app.sqlite');

let SQL;
let db;

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function saveDb() {
  const bytes = db.export();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(bytes));
}

function run(sql, params = []) {
  db.run(sql, params);
}

function all(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}

function one(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

function hasColumn(tableName, columnName) {
  return all(`PRAGMA table_info(${tableName})`).some((c) => String(c.name) === columnName);
}

function ensureColumn(tableName, columnName, definitionSql) {
  if (!hasColumn(tableName, columnName)) run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
}

function createSchema() {
  run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category_id TEXT,
    city_id TEXT,
    status TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    ad_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS feature_orders (
    id TEXT PRIMARY KEY,
    ad_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1
  )`);

  run(`CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    region TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`);

  run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    created_at TEXT NOT NULL
  )`);

  ensureColumn('users', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('ads', 'description', 'TEXT');
  ensureColumn('ads', 'category_id', 'TEXT');
  ensureColumn('ads', 'city_id', 'TEXT');
}

function logAdmin(action, targetType, targetId = null) {
  run('INSERT INTO admin_logs (id,action,target_type,target_id,created_at) VALUES (?,?,?,?,?)', [
    uid(),
    action,
    targetType,
    targetId,
    now(),
  ]);
}

function seedIfEmpty() {
  const n = Number(one('SELECT COUNT(*) AS n FROM users')?.n ?? 0);
  if (n > 0) return;

  run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', [
    uid(),
    'admin@local.test',
    bcrypt.hashSync('Admin@123456', 10),
    'Admin',
    1,
    1,
    now(),
  ]);

  const demoUsers = [
    ['u1', 'user1@example.com', 'User 1'],
    ['u2', 'user2@example.com', 'User 2'],
    ['u3', 'user3@example.com', 'User 3'],
  ];
  for (const [id, email, fullName] of demoUsers) {
    run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', [
      id,
      email,
      bcrypt.hashSync('123456', 8),
      fullName,
      0,
      1,
      now(),
    ]);
  }

  const demoAds = [
    ['a1', 'إعلان سيارة', 55000, 'cars', 'riyadh', 'pending', 0],
    ['a2', 'إعلان شقة', 380000, 'real-estate', 'jeddah', 'published', 1],
    ['a3', 'إعلان وظيفة', 7000, 'jobs', 'dammam', 'published', 0],
    ['a4', 'إعلان خدمة', 500, 'services', 'riyadh', 'pending', 0],
  ];
  for (const [id, title, price, categoryId, cityId, status, featured] of demoAds) {
    run('INSERT INTO ads (id,title,description,price,category_id,city_id,status,is_featured,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [
      id,
      title,
      '',
      price,
      categoryId,
      cityId,
      status,
      featured,
      now(),
    ]);
  }

  run('INSERT INTO reports (id,ad_id,reason,details,status,created_at) VALUES (?,?,?,?,?,?)', [
    uid(),
    'a1',
    'محتوى مخالف',
    'تفاصيل غير واضحة',
    'open',
    now(),
  ]);
  run('INSERT INTO feature_orders (id,ad_id,plan_id,status,created_at) VALUES (?,?,?,?,?)', [
    uid(),
    'a3',
    'plan-7d',
    'pending',
    now(),
  ]);

  const categories = [
    ['cars', 'سيارات', 'cars', 1],
    ['real-estate', 'عقارات', 'real-estate', 2],
    ['jobs', 'وظائف', 'jobs', 3],
    ['services', 'خدمات', 'services', 4],
  ];
  for (const [id, name, slug, sort] of categories) {
    run('INSERT INTO categories (id,name_ar,slug,parent_id,sort_order,is_active) VALUES (?,?,?,?,?,1)', [id, name, slug, null, sort]);
  }

  const cities = [
    ['riyadh', 'الرياض', 'الوسطى'],
    ['jeddah', 'جدة', 'الغربية'],
    ['dammam', 'الدمام', 'الشرقية'],
  ];
  for (const [id, name, region] of cities) {
    run('INSERT INTO cities (id,name_ar,region,is_active) VALUES (?,?,?,1)', [id, name, region]);
  }

  run('INSERT INTO messages (id,sender_id,recipient_id,body,is_read,created_at) VALUES (?,?,?,?,?,?)', [uid(), 'u1', 'u2', 'مرحبا', 0, now()]);
  run('INSERT INTO messages (id,sender_id,recipient_id,body,is_read,created_at) VALUES (?,?,?,?,?,?)', [uid(), 'u2', 'u1', 'أهلًا', 1, now()]);
  saveDb();
}

export async function initDb() {
  SQL = await initSqlJs({
    locateFile: (file) => path.resolve(__dirname, '../node_modules/sql.js/dist', file),
  });
  if (fs.existsSync(dbPath)) db = new SQL.Database(fs.readFileSync(dbPath));
  else db = new SQL.Database();
  createSchema();
  seedIfEmpty();
}

export function getUserByEmail(email) {
  return one('SELECT * FROM users WHERE lower(email)=lower(?)', [email]);
}

export function getUserById(id) {
  return one('SELECT id,email,full_name,is_admin,is_active,created_at FROM users WHERE id=?', [id]);
}

export function createUser({ email, password, fullName }) {
  if (getUserByEmail(email)) return { error: 'هذا البريد مسجل مسبقًا', user: null };
  const id = uid();
  run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', [
    id,
    email.toLowerCase().trim(),
    bcrypt.hashSync(password, 10),
    fullName?.trim() || 'مستخدم',
    0,
    1,
    now(),
  ]);
  saveDb();
  return { error: null, user: getUserById(id) };
}

export function verifyUser(email, password) {
  const user = getUserByEmail(email);
  if (!user || Number(user.is_active) !== 1) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return getUserById(user.id);
}

export function dashboardData() {
  const users = Number(one('SELECT COUNT(*) AS n FROM users')?.n ?? 0);
  const ads = Number(one('SELECT COUNT(*) AS n FROM ads')?.n ?? 0);
  const featured = Number(one('SELECT COUNT(*) AS n FROM ads WHERE is_featured=1')?.n ?? 0);
  const reports = Number(one("SELECT COUNT(*) AS n FROM reports WHERE status='open'")?.n ?? 0);
  const orders = Number(one("SELECT COUNT(*) AS n FROM feature_orders WHERE status='pending'")?.n ?? 0);
  const messages = Number(one('SELECT COUNT(*) AS n FROM messages')?.n ?? 0);
  return {
    stats: { users, ads, featured, reports, orders, messages },
    pending: all("SELECT id,title,price,status,is_featured,created_at FROM ads WHERE status='pending' ORDER BY created_at DESC LIMIT 100"),
    allAds: all('SELECT id,title,price,status,is_featured,created_at FROM ads ORDER BY created_at DESC LIMIT 300'),
    reports: all('SELECT id,ad_id,reason,details,status,created_at FROM reports ORDER BY created_at DESC LIMIT 300'),
    orders: all('SELECT id,ad_id,plan_id,status,created_at FROM feature_orders ORDER BY created_at DESC LIMIT 300'),
    categories: all('SELECT id,name_ar,slug,parent_id,sort_order,is_active FROM categories ORDER BY sort_order ASC'),
    cities: all('SELECT id,name_ar,region,is_active FROM cities ORDER BY name_ar ASC'),
    logs: all('SELECT id,action,target_type,target_id,created_at FROM admin_logs ORDER BY created_at DESC LIMIT 300'),
    usersList: all('SELECT id,email,full_name,is_admin,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 300'),
    messagesList: all('SELECT id,sender_id,recipient_id,body,is_read,created_at FROM messages ORDER BY created_at DESC LIMIT 300'),
  };
}

export function setAdStatus(adId, status) {
  run('UPDATE ads SET status=? WHERE id=?', [status, adId]);
  logAdmin('set_ad_status', 'ad', adId);
  saveDb();
}

export function setAdFeatured(adId, isFeatured) {
  run('UPDATE ads SET is_featured=? WHERE id=?', [isFeatured ? 1 : 0, adId]);
  logAdmin('set_ad_featured', 'ad', adId);
  saveDb();
}

export function removeAd(adId) {
  run('DELETE FROM ads WHERE id=?', [adId]);
  run('DELETE FROM reports WHERE ad_id=?', [adId]);
  run('DELETE FROM feature_orders WHERE ad_id=?', [adId]);
  logAdmin('delete_ad', 'ad', adId);
  saveDb();
}

export function createAd(payload) {
  const id = uid();
  run('INSERT INTO ads (id,title,description,price,category_id,city_id,status,is_featured,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [
    id,
    payload.title,
    payload.description || '',
    Number(payload.price || 0),
    payload.category_id || null,
    payload.city_id || null,
    payload.status || 'pending',
    payload.is_featured ? 1 : 0,
    now(),
  ]);
  logAdmin('create_ad', 'ad', id);
  saveDb();
  return id;
}

export function setReportStatus(reportId, status) {
  run('UPDATE reports SET status=? WHERE id=?', [status, reportId]);
  logAdmin('resolve_report', 'report', reportId);
  saveDb();
}

export function activateOrder(orderId) {
  const o = one('SELECT * FROM feature_orders WHERE id=?', [orderId]);
  if (!o) return;
  run("UPDATE feature_orders SET status='active' WHERE id=?", [orderId]);
  run('UPDATE ads SET is_featured=1 WHERE id=?', [o.ad_id]);
  logAdmin('activate_order', 'order', orderId);
  saveDb();
}

export function createCategory(payload) {
  run('INSERT INTO categories (id,name_ar,slug,parent_id,sort_order,is_active) VALUES (?,?,?,?,?,1)', [
    payload.id,
    payload.name_ar,
    payload.slug,
    payload.parent_id || null,
    Number(payload.sort_order || 100),
  ]);
  logAdmin('create_category', 'category', payload.id);
  saveDb();
}

export function createCity(payload) {
  run('INSERT INTO cities (id,name_ar,region,is_active) VALUES (?,?,?,1)', [payload.id, payload.name_ar, payload.region]);
  logAdmin('create_city', 'city', payload.id);
  saveDb();
}

export function toggleCategory(id) {
  run('UPDATE categories SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
  logAdmin('toggle_category', 'category', id);
  saveDb();
}

export function toggleCity(id) {
  run('UPDATE cities SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
  logAdmin('toggle_city', 'city', id);
  saveDb();
}

export function listUsers() {
  return all('SELECT id,email,full_name,is_admin,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 500');
}

export function toggleUserAdmin(id) {
  run('UPDATE users SET is_admin = CASE WHEN is_admin=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
  logAdmin('toggle_user_admin', 'user', id);
  saveDb();
}

export function toggleUserActive(id) {
  run('UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
  logAdmin('toggle_user_active', 'user', id);
  saveDb();
}

export function resetUserPassword(id, password) {
  run('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(password, 10), id]);
  logAdmin('reset_user_password', 'user', id);
  saveDb();
}

export function listMessages() {
  return all('SELECT id,sender_id,recipient_id,body,is_read,created_at FROM messages ORDER BY created_at DESC LIMIT 500');
}

export function sendMessage(payload) {
  const id = uid();
  run('INSERT INTO messages (id,sender_id,recipient_id,body,is_read,created_at) VALUES (?,?,?,?,?,?)', [
    id,
    payload.sender_id,
    payload.recipient_id,
    payload.body,
    0,
    now(),
  ]);
  logAdmin('send_message', 'message', id);
  saveDb();
  return id;
}

export function deleteMessage(id) {
  run('DELETE FROM messages WHERE id=?', [id]);
  logAdmin('delete_message', 'message', id);
  saveDb();
}
