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

  run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    icon TEXT,
    image TEXT
  )`);

  run(`CREATE TABLE IF NOT EXISTS category_closure (
    ancestor_id TEXT NOT NULL,
    descendant_id TEXT NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS custom_fields (
    id TEXT PRIMARY KEY,
    field_key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    placeholder TEXT,
    required INTEGER NOT NULL DEFAULT 0,
    options_json TEXT,
    validation_json TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_filterable INTEGER NOT NULL DEFAULT 1,
    is_searchable INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  )`);

  run(`CREATE TABLE IF NOT EXISTS category_field_map (
    category_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 100,
    PRIMARY KEY (category_id, field_id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    city_id TEXT,
    status TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    category_id TEXT
  )`);

  run(`CREATE TABLE IF NOT EXISTS ad_field_values (
    id TEXT PRIMARY KEY,
    ad_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value_text TEXT,
    value_number REAL,
    value_bool INTEGER,
    value_json TEXT
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

  run(`CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
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

  // Backward compatible migrations
  ensureColumn('categories', 'name', 'TEXT');
  try { run('UPDATE categories SET name = COALESCE(name, name_ar)'); } catch {}
  ensureColumn('cities', 'name', 'TEXT');
  try { run('UPDATE cities SET name = COALESCE(name, name_ar)'); } catch {}
}

function logAdmin(action, targetType, targetId = null) {
  run('INSERT INTO admin_logs (id,action,target_type,target_id,created_at) VALUES (?,?,?,?,?)', [uid(), action, targetType, targetId, now()]);
}

function resetTaxonomySeed() {
  const n = Number(one('SELECT COUNT(*) AS n FROM categories')?.n ?? 0);
  if (n > 0) return;

  const categories = [
    ['cat_realestate', 'عقارات', 'real-estate', null, 1],
    ['cat_realestate_sale', 'للبيع', 'sale', 'cat_realestate', 1],
    ['cat_realestate_rent', 'للإيجار', 'rent', 'cat_realestate', 2],
    ['cat_realestate_sale_res', 'سكن', 'residential', 'cat_realestate_sale', 1],
    ['cat_realestate_rent_res', 'سكن', 'residential-rent', 'cat_realestate_rent', 1],
    ['cat_apartment_sale', 'شقة', 'apartment-sale', 'cat_realestate_sale_res', 1],
    ['cat_apartment_rent', 'شقة', 'apartment-rent', 'cat_realestate_rent_res', 1],

    ['cat_cars', 'سيارات', 'cars', null, 2],
    ['cat_cars_cars', 'سيارات', 'cars-main', 'cat_cars', 1],
    ['cat_cars_sedan', 'سيدان', 'sedan', 'cat_cars_cars', 1],
    ['cat_cars_suv', 'SUV', 'suv', 'cat_cars_cars', 2],

    ['cat_parts', 'قطع غيار', 'parts', null, 3],
    ['cat_parts_vehicle', 'السيارات وسيارات الدفع الرباعي', 'vehicle-parts', 'cat_parts', 1],
    ['cat_parts_type', 'قطع غيار', 'parts-type', 'cat_parts_vehicle', 1],
    ['cat_parts_electric', 'كهربائي', 'electric-parts', 'cat_parts_type', 1],
  ];

  for (const [id, name, slug, parentId, sortOrder] of categories) {
    run('INSERT INTO categories (id,name,slug,parent_id,sort_order,is_active,icon,image) VALUES (?,?,?,?,?,1,?,?)', [
      id,
      name,
      slug,
      parentId,
      sortOrder,
      null,
      null,
    ]);
  }

  rebuildCategoryClosure();

  const fields = [
    ['f_brand', 'brand', 'الماركة', 'select', null, 1, JSON.stringify(['Toyota', 'Jeep', 'BMW', 'Mercedes', 'Hyundai']), '{}', 1, 1, 1],
    ['f_model', 'model', 'الموديل', 'text', 'مثال: رانجلر', 1, null, '{}', 2, 1, 1],
    ['f_year', 'year', 'سنة الصنع', 'number', '2025', 1, null, '{"min":1950,"max":2035}', 3, 1, 1],
    ['f_fuel', 'fuel', 'الوقود', 'select', null, 1, JSON.stringify(['بنزين', 'ديزل', 'هجين', 'كهربائي']), '{}', 4, 1, 1],
    ['f_transmission', 'transmission', 'القير', 'select', null, 0, JSON.stringify(['أوتوماتيك', 'عادي']), '{}', 5, 1, 0],
    ['f_color', 'color', 'اللون', 'text', null, 0, null, '{}', 6, 1, 0],
    ['f_mileage', 'mileage', 'العداد', 'number', null, 0, null, '{"min":0}', 7, 1, 0],

    ['f_area', 'area', 'المساحة', 'number', 'متر مربع', 1, null, '{"min":1}', 1, 1, 1],
    ['f_rooms', 'rooms', 'عدد الغرف', 'number', null, 1, null, '{"min":0,"max":20}', 2, 1, 1],
    ['f_bathrooms', 'bathrooms', 'عدد الحمامات', 'number', null, 0, null, '{"min":0,"max":20}', 3, 1, 1],
    ['f_furnished', 'furnished', 'مفروش', 'boolean', null, 0, null, '{}', 4, 1, 0],
    ['f_floor', 'floor', 'الطابق', 'number', null, 0, null, '{}', 5, 1, 0],
    ['f_property_age', 'property_age', 'عمر العقار', 'number', null, 0, null, '{}', 6, 1, 0],

    ['f_part_type', 'part_type', 'نوع القطعة', 'text', null, 1, null, '{}', 1, 1, 1],
    ['f_part_brand', 'part_brand', 'الشركة', 'text', null, 0, null, '{}', 2, 1, 1],
    ['f_compatibility', 'compatibility', 'التوافق', 'text', null, 0, null, '{}', 3, 1, 1],
    ['f_part_condition', 'part_condition', 'الحالة', 'select', null, 0, JSON.stringify(['جديد', 'مستعمل']), '{}', 4, 1, 1],
  ];

  for (const field of fields) {
    run('INSERT INTO custom_fields (id,field_key,label,type,placeholder,required,options_json,validation_json,sort_order,is_filterable,is_searchable,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)', field);
  }

  const map = [
    ['cat_cars_sedan', 'f_brand', 1], ['cat_cars_sedan', 'f_model', 2], ['cat_cars_sedan', 'f_year', 3], ['cat_cars_sedan', 'f_fuel', 4], ['cat_cars_sedan', 'f_transmission', 5], ['cat_cars_sedan', 'f_color', 6], ['cat_cars_sedan', 'f_mileage', 7],
    ['cat_cars_suv', 'f_brand', 1], ['cat_cars_suv', 'f_model', 2], ['cat_cars_suv', 'f_year', 3], ['cat_cars_suv', 'f_fuel', 4], ['cat_cars_suv', 'f_transmission', 5], ['cat_cars_suv', 'f_color', 6], ['cat_cars_suv', 'f_mileage', 7],
    ['cat_apartment_sale', 'f_area', 1], ['cat_apartment_sale', 'f_rooms', 2], ['cat_apartment_sale', 'f_bathrooms', 3], ['cat_apartment_sale', 'f_furnished', 4], ['cat_apartment_sale', 'f_floor', 5], ['cat_apartment_sale', 'f_property_age', 6],
    ['cat_apartment_rent', 'f_area', 1], ['cat_apartment_rent', 'f_rooms', 2], ['cat_apartment_rent', 'f_bathrooms', 3], ['cat_apartment_rent', 'f_furnished', 4], ['cat_apartment_rent', 'f_floor', 5], ['cat_apartment_rent', 'f_property_age', 6],
    ['cat_parts_electric', 'f_part_type', 1], ['cat_parts_electric', 'f_part_brand', 2], ['cat_parts_electric', 'f_compatibility', 3], ['cat_parts_electric', 'f_part_condition', 4],
  ];
  for (const [catId, fieldId, sortOrder] of map) {
    run('INSERT INTO category_field_map (category_id,field_id,sort_order) VALUES (?,?,?)', [catId, fieldId, sortOrder]);
  }
}

function seedIfEmpty() {
  const usersCount = Number(one('SELECT COUNT(*) AS n FROM users')?.n ?? 0);
  if (usersCount === 0) {
    run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', [uid(), 'admin@local.test', bcrypt.hashSync('Admin@123456', 10), 'Admin', 1, 1, now()]);
    run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', ['u1', 'user1@example.com', bcrypt.hashSync('123456', 8), 'User 1', 0, 1, now()]);
    run('INSERT INTO users (id,email,password_hash,full_name,is_admin,is_active,created_at) VALUES (?,?,?,?,?,?,?)', ['u2', 'user2@example.com', bcrypt.hashSync('123456', 8), 'User 2', 0, 1, now()]);
  }

  const citiesCount = Number(one('SELECT COUNT(*) AS n FROM cities')?.n ?? 0);
  if (citiesCount === 0) {
    const cities = [
      ['riyadh', 'الرياض', 'الوسطى'],
      ['jeddah', 'جدة', 'الغربية'],
      ['dammam', 'الدمام', 'الشرقية'],
    ];
    for (const [id, name, region] of cities) run('INSERT INTO cities (id,name,region,is_active) VALUES (?,?,?,1)', [id, name, region]);
  }

  resetTaxonomySeed();

  const adsCount = Number(one('SELECT COUNT(*) AS n FROM ads')?.n ?? 0);
  if (adsCount === 0) {
    const ad1 = uid();
    run('INSERT INTO ads (id,user_id,title,description,price,city_id,status,is_featured,created_at,category_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [
      ad1, 'u1', 'شقة للبيع في الرياض', 'شقة ممتازة', 420000, 'riyadh', 'published', 1, now(), 'cat_apartment_sale',
    ]);
    setAdFieldValue(ad1, 'f_area', { number: 160 });
    setAdFieldValue(ad1, 'f_rooms', { number: 4 });
    setAdFieldValue(ad1, 'f_bathrooms', { number: 3 });
    setAdFieldValue(ad1, 'f_furnished', { bool: 0 });

    const ad2 = uid();
    run('INSERT INTO ads (id,user_id,title,description,price,city_id,status,is_featured,created_at,category_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [
      ad2, 'u2', 'جيب رانجلر 2025 كهربائي', 'سيارة بحالة الوكالة', 215000, 'jeddah', 'published', 0, now(), 'cat_cars_suv',
    ]);
    setAdFieldValue(ad2, 'f_brand', { text: 'Jeep' });
    setAdFieldValue(ad2, 'f_model', { text: 'Wrangler A290' });
    setAdFieldValue(ad2, 'f_year', { number: 2025 });
    setAdFieldValue(ad2, 'f_fuel', { text: 'كهربائي' });

    const ad3 = uid();
    run('INSERT INTO ads (id,user_id,title,description,price,city_id,status,is_featured,created_at,category_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [
      ad3, 'u1', 'قطعة كهربائية للسيارات', 'قطعة أصلية', 900, 'dammam', 'pending', 0, now(), 'cat_parts_electric',
    ]);
    setAdFieldValue(ad3, 'f_part_type', { text: 'شاحن' });
    setAdFieldValue(ad3, 'f_part_brand', { text: 'Bosch' });

    run('INSERT INTO reports (id,ad_id,reason,details,status,created_at) VALUES (?,?,?,?,?,?)', [uid(), ad3, 'مخالفة', 'يرجى مراجعة الإعلان', 'open', now()]);
    run('INSERT INTO feature_orders (id,ad_id,plan_id,status,created_at) VALUES (?,?,?,?,?)', [uid(), ad2, 'plan-7d', 'pending', now()]);
    run('INSERT INTO messages (id,sender_id,recipient_id,body,is_read,created_at) VALUES (?,?,?,?,?,?)', [uid(), 'u1', 'u2', 'مرحبا، هل الإعلان متاح؟', 0, now()]);
    saveDb();
  }
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

function rebuildCategoryClosure() {
  run('DELETE FROM category_closure');
  const categories = all('SELECT id,parent_id FROM categories');
  const byParent = new Map();
  for (const c of categories) {
    const p = c.parent_id ?? '__root__';
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(c.id);
  }

  for (const c of categories) {
    run('INSERT INTO category_closure (ancestor_id,descendant_id,depth) VALUES (?,?,0)', [c.id, c.id]);
  }

  const traverse = (ancestor, node, depth) => {
    const children = byParent.get(node) ?? [];
    for (const child of children) {
      run('INSERT INTO category_closure (ancestor_id,descendant_id,depth) VALUES (?,?,?)', [ancestor, child, depth]);
      traverse(ancestor, child, depth + 1);
    }
  };

  for (const c of categories) traverse(c.id, c.id, 1);
  saveDb();
}

function setAdFieldValue(adId, fieldId, value) {
  run('INSERT INTO ad_field_values (id,ad_id,field_id,value_text,value_number,value_bool,value_json) VALUES (?,?,?,?,?,?,?)', [
    uid(),
    adId,
    fieldId,
    value.text ?? null,
    value.number ?? null,
    value.bool ?? null,
    value.json ? JSON.stringify(value.json) : null,
  ]);
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

export function getCategoryRoots() {
  return all('SELECT id,name,slug,parent_id,sort_order,is_active,icon,image FROM categories WHERE parent_id IS NULL AND is_active=1 ORDER BY sort_order ASC');
}

export function listCitiesPublic() {
  return all('SELECT id,name,region FROM cities WHERE is_active=1 ORDER BY name ASC');
}

export function getCategoryChildren(parentId) {
  return all('SELECT id,name,slug,parent_id,sort_order,is_active,icon,image FROM categories WHERE parent_id IS ? AND is_active=1 ORDER BY sort_order ASC', [parentId]);
}

export function getCategoryById(categoryId) {
  return one('SELECT id,name,slug,parent_id,sort_order,is_active,icon,image FROM categories WHERE id=?', [categoryId]);
}

export function getCategoryBySlug(slug) {
  return one('SELECT id,name,slug,parent_id,sort_order,is_active,icon,image FROM categories WHERE slug=?', [slug]);
}

export function getCategoryBreadcrumb(categoryId) {
  return all(`
    SELECT c.id,c.name,c.slug,c.parent_id,c.sort_order,c.is_active,c.icon,c.image, cc.depth
    FROM category_closure cc
    JOIN categories c ON c.id = cc.ancestor_id
    WHERE cc.descendant_id=?
    ORDER BY cc.depth DESC
  `, [categoryId]);
}

export function getCategoryDescendants(categoryId, includeSelf = true) {
  const rows = all(`
    SELECT c.id,c.name,c.slug,c.parent_id,c.sort_order,c.is_active,c.icon,c.image, cc.depth
    FROM category_closure cc
    JOIN categories c ON c.id = cc.descendant_id
    WHERE cc.ancestor_id=?
    ORDER BY cc.depth ASC, c.sort_order ASC
  `, [categoryId]);
  return includeSelf ? rows : rows.filter((r) => Number(r.depth) > 0);
}

export function getCategoryFields(categoryId) {
  return all(`
    SELECT cf.id,cf.field_key,cf.label,cf.type,cf.placeholder,cf.required,cf.options_json,cf.validation_json,
           cf.sort_order,cf.is_filterable,cf.is_searchable,cf.is_active, m.sort_order AS map_sort
    FROM category_field_map m
    JOIN custom_fields cf ON cf.id = m.field_id
    WHERE m.category_id=? AND cf.is_active=1
    ORDER BY m.sort_order ASC, cf.sort_order ASC
  `, [categoryId]).map((f) => ({
    ...f,
    required: Number(f.required) === 1,
    is_filterable: Number(f.is_filterable) === 1,
    is_searchable: Number(f.is_searchable) === 1,
    options: f.options_json ? JSON.parse(String(f.options_json)) : null,
    validation: f.validation_json ? JSON.parse(String(f.validation_json)) : {},
  }));
}

export function getFiltersForCategory(categoryId) {
  return all(`
    SELECT DISTINCT cf.id,cf.field_key,cf.label,cf.type,cf.placeholder,cf.required,cf.options_json,cf.validation_json,
           cf.sort_order,cf.is_filterable,cf.is_searchable
    FROM category_closure cc
    JOIN category_field_map m ON m.category_id = cc.descendant_id
    JOIN custom_fields cf ON cf.id = m.field_id
    WHERE cc.ancestor_id=? AND cf.is_active=1 AND cf.is_filterable=1
    ORDER BY cf.sort_order ASC
  `, [categoryId]).map((f) => ({
    ...f,
    required: Number(f.required) === 1,
    is_filterable: Number(f.is_filterable) === 1,
    is_searchable: Number(f.is_searchable) === 1,
    options: f.options_json ? JSON.parse(String(f.options_json)) : null,
    validation: f.validation_json ? JSON.parse(String(f.validation_json)) : {},
  }));
}

export function createAdWithFields(payload) {
  const id = uid();
  run('INSERT INTO ads (id,user_id,title,description,price,city_id,status,is_featured,created_at,category_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [
    id,
    payload.user_id ?? null,
    payload.title,
    payload.description ?? '',
    Number(payload.price || 0),
    payload.city_id ?? null,
    payload.status ?? 'pending',
    payload.is_featured ? 1 : 0,
    now(),
    payload.category_id,
  ]);

  const values = payload.field_values ?? {};
  for (const [fieldKey, raw] of Object.entries(values)) {
    if (raw === '' || raw === null || raw === undefined) continue;
    const field = one('SELECT id,type FROM custom_fields WHERE field_key=?', [fieldKey]);
    if (!field) continue;
    const type = String(field.type);
    const value = { text: null, number: null, bool: null, json: null };
    if (['text', 'textarea', 'select', 'radio', 'date'].includes(type)) value.text = String(raw);
    else if (['number'].includes(type)) value.number = Number(raw);
    else if (['boolean', 'checkbox'].includes(type)) value.bool = raw ? 1 : 0;
    else value.json = raw;
    setAdFieldValue(id, field.id, value);
  }

  logAdmin('create_ad', 'ad', id);
  saveDb();
  return id;
}

export function getAdsWithFilters(params) {
  const where = ["a.status='published'"];
  const binds = [];

  let selectedCategoryId = null;
  if (params.category) {
    const cat = getCategoryBySlug(params.category) ?? getCategoryById(params.category);
    if (cat) {
      selectedCategoryId = cat.id;
      const descendants = getCategoryDescendants(cat.id, true).map((d) => d.id);
      if (descendants.length > 0) {
        where.push(`a.category_id IN (${descendants.map(() => '?').join(',')})`);
        binds.push(...descendants);
      }
    }
  }

  if (params.q) {
    where.push('(LOWER(a.title) LIKE ? OR LOWER(a.description) LIKE ?)');
    binds.push(`%${String(params.q).toLowerCase()}%`, `%${String(params.q).toLowerCase()}%`);
  }
  if (params.city) {
    where.push('a.city_id = ?');
    binds.push(params.city);
  }
  if (params.price_min !== undefined && params.price_min !== '') {
    where.push('a.price >= ?');
    binds.push(Number(params.price_min));
  }
  if (params.price_max !== undefined && params.price_max !== '') {
    where.push('a.price <= ?');
    binds.push(Number(params.price_max));
  }
  if (params.featured === '1') where.push('a.is_featured = 1');

  const dynamicFilters = params.dynamic_filters ?? {};
  for (const [fieldKey, value] of Object.entries(dynamicFilters)) {
    if (value === '' || value === undefined || value === null) continue;
    const field = one('SELECT id,type FROM custom_fields WHERE field_key=?', [fieldKey]);
    if (!field) continue;
    if (String(field.type) === 'number') {
      where.push(`EXISTS (SELECT 1 FROM ad_field_values afv WHERE afv.ad_id=a.id AND afv.field_id=? AND afv.value_number=?)`);
      binds.push(field.id, Number(value));
    } else if (String(field.type) === 'boolean' || String(field.type) === 'checkbox') {
      where.push(`EXISTS (SELECT 1 FROM ad_field_values afv WHERE afv.ad_id=a.id AND afv.field_id=? AND afv.value_bool=?)`);
      binds.push(field.id, value === '1' || value === 1 || value === true ? 1 : 0);
    } else {
      where.push(`EXISTS (SELECT 1 FROM ad_field_values afv WHERE afv.ad_id=a.id AND afv.field_id=? AND LOWER(afv.value_text)=LOWER(?))`);
      binds.push(field.id, String(value));
    }
  }

  let order = 'a.created_at DESC';
  if (params.sort === 'price_asc') order = 'a.price ASC';
  else if (params.sort === 'price_desc') order = 'a.price DESC';
  else if (params.sort === 'featured') order = 'a.is_featured DESC, a.created_at DESC';

  const page = Math.max(Number(params.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.page_size || 24), 1), 100);
  const offset = (page - 1) * pageSize;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(one(`SELECT COUNT(*) AS n FROM ads a ${whereSql}`, binds)?.n ?? 0);

  const ads = all(
    `SELECT a.id,a.user_id,a.title,a.description,a.price,a.city_id,a.status,a.is_featured,a.created_at,a.category_id,
            c.slug AS category_slug, c.name AS category_name,
            ci.name AS city_name
     FROM ads a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN cities ci ON ci.id = a.city_id
     ${whereSql}
     ORDER BY ${order}
     LIMIT ? OFFSET ?`,
    [...binds, pageSize, offset],
  );

  const adIds = ads.map((a) => a.id);
  const fields = adIds.length === 0 ? [] : all(
    `SELECT afv.ad_id, cf.field_key, afv.value_text, afv.value_number, afv.value_bool, afv.value_json
     FROM ad_field_values afv
     JOIN custom_fields cf ON cf.id = afv.field_id
     WHERE afv.ad_id IN (${adIds.map(() => '?').join(',')})`,
    adIds,
  );

  const fieldsByAd = new Map();
  for (const row of fields) {
    if (!fieldsByAd.has(row.ad_id)) fieldsByAd.set(row.ad_id, {});
    const obj = fieldsByAd.get(row.ad_id);
    const key = row.field_key;
    if (row.value_number !== null && row.value_number !== undefined) obj[key] = Number(row.value_number);
    else if (row.value_bool !== null && row.value_bool !== undefined) obj[key] = Number(row.value_bool) === 1;
    else if (row.value_text !== null && row.value_text !== undefined) obj[key] = String(row.value_text);
    else if (row.value_json) obj[key] = JSON.parse(String(row.value_json));
  }

  const selectedCategory = selectedCategoryId ? getCategoryById(selectedCategoryId) : null;
  const children = selectedCategoryId ? getCategoryChildren(selectedCategoryId) : getCategoryRoots();
  const breadcrumb = selectedCategoryId ? getCategoryBreadcrumb(selectedCategoryId) : [];
  const filters = selectedCategoryId ? getFiltersForCategory(selectedCategoryId) : [];

  return {
    items: ads.map((a) => ({
      ...a,
      is_featured: Number(a.is_featured) === 1,
      field_values: fieldsByAd.get(a.id) ?? {},
    })),
    total,
    page,
    page_size: pageSize,
    selected_category: selectedCategory,
    breadcrumb,
    children,
    filters,
  };
}

// Existing admin APIs
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
    categories: all('SELECT id,name AS name_ar,slug,parent_id,sort_order,is_active FROM categories ORDER BY sort_order ASC'),
    cities: all('SELECT id,name AS name_ar,region,is_active FROM cities ORDER BY name ASC'),
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
  run('DELETE FROM ad_field_values WHERE ad_id=?', [adId]);
  logAdmin('delete_ad', 'ad', adId);
  saveDb();
}

export function createAd(payload) {
  return createAdWithFields(payload);
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
  run('INSERT INTO categories (id,name,slug,parent_id,sort_order,is_active,icon,image) VALUES (?,?,?,?,?,1,?,?)', [
    payload.id,
    payload.name_ar ?? payload.name,
    payload.slug,
    payload.parent_id || null,
    Number(payload.sort_order || 100),
    payload.icon ?? null,
    payload.image ?? null,
  ]);
  rebuildCategoryClosure();
  logAdmin('create_category', 'category', payload.id);
  saveDb();
}

export function createCity(payload) {
  run('INSERT INTO cities (id,name,region,is_active) VALUES (?,?,?,1)', [payload.id, payload.name_ar ?? payload.name, payload.region]);
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
