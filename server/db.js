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

function saveDb() {
  const bytes = db.export();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(bytes));
}

function stmtAll(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}

function stmtOne(sql, params = []) {
  const rows = stmtAll(sql, params);
  return rows[0] ?? null;
}

function run(sql, params = []) {
  db.run(sql, params);
}

function seed() {
  const existing = stmtOne('SELECT COUNT(*) AS n FROM users');
  if (Number(existing?.n ?? 0) > 0) return;

  const adminId = crypto.randomUUID();
  const adminHash = bcrypt.hashSync('Admin@123456', 10);
  run(
    'INSERT INTO users (id,email,password_hash,full_name,is_admin,created_at) VALUES (?,?,?,?,?,?)',
    [adminId, 'admin@local.test', adminHash, 'Admin', 1, now()],
  );

  const demoUsers = [
    ['u1', 'user1@example.com', 'عبدالله الحربي', 0],
    ['u2', 'user2@example.com', 'فاطمة الزهراني', 0],
    ['u3', 'user3@example.com', 'خالد العتيبي', 0],
  ];
  for (const [id, email, fullName, isAdmin] of demoUsers) {
    run(
      'INSERT INTO users (id,email,password_hash,full_name,is_admin,created_at) VALUES (?,?,?,?,?,?)',
      [id, email, bcrypt.hashSync('123456', 8), fullName, isAdmin, now()],
    );
  }

  const demoAds = [
    ['a1', 'سيارة تويوتا لاندكروزر 2022', 285000, 'pending', 0],
    ['a2', 'فيلا فاخرة جدة', 4200000, 'published', 1],
    ['a3', 'شقة للإيجار السنوي', 38000, 'published', 0],
    ['a4', 'آيفون 15 برو ماكس', 4800, 'pending', 0],
  ];
  for (const [id, title, price, status, featured] of demoAds) {
    run(
      'INSERT INTO ads (id,title,price,status,is_featured,created_at) VALUES (?,?,?,?,?,?)',
      [id, title, price, status, featured, now()],
    );
  }

  run(
    'INSERT INTO reports (id,ad_id,reason,details,status,created_at) VALUES (?,?,?,?,?,?)',
    [crypto.randomUUID(), 'a1', 'محتوى مضلل', 'السعر لا يطابق الوصف', 'open', now()],
  );
  run(
    'INSERT INTO feature_orders (id,ad_id,plan_id,status,created_at) VALUES (?,?,?,?,?)',
    [crypto.randomUUID(), 'a3', 'plan-7d', 'pending', now()],
  );

  const categories = [
    ['cars', 'سيارات', 'cars', 1],
    ['real-estate', 'عقارات', 'real-estate', 2],
    ['jobs', 'وظائف', 'jobs', 3],
    ['services', 'خدمات', 'services', 4],
  ];
  for (const [id, name, slug, order] of categories) {
    run('INSERT INTO categories (id,name_ar,slug,parent_id,sort_order,is_active) VALUES (?,?,?,?,?,?)', [
      id,
      name,
      slug,
      null,
      order,
      1,
    ]);
  }

  const cities = [
    ['riyadh', 'الرياض', 'الوسطى'],
    ['jeddah', 'جدة', 'الغربية'],
    ['dammam', 'الدمام', 'الشرقية'],
  ];
  for (const [id, name, region] of cities) {
    run('INSERT INTO cities (id,name_ar,region,is_active) VALUES (?,?,?,?)', [id, name, region, 1]);
  }

  saveDb();
}

function createSchema() {
  run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  run(`CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price REAL NOT NULL,
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
  run(`CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    created_at TEXT NOT NULL
  )`);
}

export async function initDb() {
  SQL = await initSqlJs({
    locateFile: (file) => path.resolve(__dirname, '../node_modules/sql.js/dist', file),
  });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  seed();
}

export function getUserByEmail(email) {
  return stmtOne('SELECT * FROM users WHERE lower(email)=lower(?)', [email]);
}

export function getUserById(id) {
  return stmtOne('SELECT id,email,full_name,is_admin,created_at FROM users WHERE id=?', [id]);
}

export function createUser({ email, password, fullName }) {
  const exists = getUserByEmail(email);
  if (exists) return { error: 'هذا البريد مسجل مسبقًا', user: null };
  const uid = crypto.randomUUID();
  run(
    'INSERT INTO users (id,email,password_hash,full_name,is_admin,created_at) VALUES (?,?,?,?,?,?)',
    [uid, email.toLowerCase().trim(), bcrypt.hashSync(password, 10), fullName?.trim() || 'مستخدم', 0, now()],
  );
  saveDb();
  return { error: null, user: getUserById(uid) };
}

export function verifyUser(email, password) {
  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return getUserById(user.id);
}

export function dashboardData() {
  const users = Number(stmtOne('SELECT COUNT(*) AS n FROM users')?.n ?? 0);
  const ads = Number(stmtOne('SELECT COUNT(*) AS n FROM ads')?.n ?? 0);
  const featured = Number(stmtOne('SELECT COUNT(*) AS n FROM ads WHERE is_featured=1')?.n ?? 0);
  const reportsCount = Number(stmtOne("SELECT COUNT(*) AS n FROM reports WHERE status='open'")?.n ?? 0);
  const ordersCount = Number(stmtOne("SELECT COUNT(*) AS n FROM feature_orders WHERE status='pending'")?.n ?? 0);
  const messages = 12;

  return {
    stats: { users, ads, featured, reports: reportsCount, orders: ordersCount, messages },
    pending: stmtAll("SELECT id,title,price,status,is_featured,created_at FROM ads WHERE status='pending' ORDER BY created_at DESC LIMIT 50"),
    allAds: stmtAll('SELECT id,title,price,status,is_featured,created_at FROM ads ORDER BY created_at DESC LIMIT 100'),
    reports: stmtAll('SELECT id,ad_id,reason,details,status,created_at FROM reports ORDER BY created_at DESC LIMIT 100'),
    orders: stmtAll('SELECT id,ad_id,plan_id,status,created_at FROM feature_orders ORDER BY created_at DESC LIMIT 100'),
    categories: stmtAll('SELECT id,name_ar,slug,parent_id,sort_order,is_active FROM categories ORDER BY sort_order ASC'),
    cities: stmtAll('SELECT id,name_ar,region,is_active FROM cities ORDER BY name_ar ASC'),
    logs: stmtAll('SELECT id,action,target_type,target_id,created_at FROM admin_logs ORDER BY created_at DESC LIMIT 100'),
  };
}

export function logAdmin(action, type, targetId = null) {
  run('INSERT INTO admin_logs (id,action,target_type,target_id,created_at) VALUES (?,?,?,?,?)', [
    crypto.randomUUID(),
    action,
    type,
    targetId,
    now(),
  ]);
}

export function setAdStatus(adId, status) {
  run('UPDATE ads SET status=? WHERE id=?', [status, adId]);
  logAdmin('update_ad_status', 'ad', adId);
  saveDb();
}

export function setAdFeatured(adId, isFeatured) {
  run('UPDATE ads SET is_featured=? WHERE id=?', [isFeatured ? 1 : 0, adId]);
  logAdmin(isFeatured ? 'feature_ad' : 'unfeature_ad', 'ad', adId);
  saveDb();
}

export function removeAd(adId) {
  run('DELETE FROM ads WHERE id=?', [adId]);
  run('DELETE FROM reports WHERE ad_id=?', [adId]);
  run('DELETE FROM feature_orders WHERE ad_id=?', [adId]);
  logAdmin('delete_ad', 'ad', adId);
  saveDb();
}

export function setReportStatus(reportId, status) {
  run('UPDATE reports SET status=? WHERE id=?', [status, reportId]);
  logAdmin('resolve_report', 'report', reportId);
  saveDb();
}

export function activateOrder(orderId) {
  const order = stmtOne('SELECT * FROM feature_orders WHERE id=?', [orderId]);
  if (!order) return;
  run("UPDATE feature_orders SET status='active' WHERE id=?", [orderId]);
  run("UPDATE ads SET is_featured=1 WHERE id=?", [order.ad_id]);
  logAdmin('activate_feature_order', 'order', orderId);
  saveDb();
}

export function createCategory({ id, name_ar, slug, parent_id, sort_order }) {
  run('INSERT INTO categories (id,name_ar,slug,parent_id,sort_order,is_active) VALUES (?,?,?,?,?,1)', [
    id,
    name_ar,
    slug,
    parent_id,
    sort_order,
  ]);
  logAdmin('add_category', 'category', id);
  saveDb();
}

export function createCity({ id, name_ar, region }) {
  run('INSERT INTO cities (id,name_ar,region,is_active) VALUES (?,?,?,1)', [id, name_ar, region]);
  logAdmin('add_city', 'city', id);
  saveDb();
}

export function toggleCategory(idValue) {
  run('UPDATE categories SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?', [idValue]);
  logAdmin('toggle_category', 'category', idValue);
  saveDb();
}

export function toggleCity(idValue) {
  run('UPDATE cities SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?', [idValue]);
  logAdmin('toggle_city', 'city', idValue);
  saveDb();
}
