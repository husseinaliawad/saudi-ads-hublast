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

function insertCategoryNode(node, parentId, sortOrder = 100) {
  run('INSERT OR IGNORE INTO categories (id,name,slug,parent_id,sort_order,is_active,icon,image) VALUES (?,?,?,?,?,1,?,?)', [
    node.id,
    node.name,
    node.slug,
    parentId,
    sortOrder,
    node.icon ?? null,
    node.image ?? null,
  ]);
  run('UPDATE categories SET name=?, slug=?, parent_id=COALESCE(parent_id, ?), sort_order=COALESCE(sort_order, ?), is_active=1 WHERE id=?', [
    node.name,
    node.slug,
    parentId,
    sortOrder,
    node.id,
  ]);

  const children = node.children ?? [];
  children.forEach((child, idx) => insertCategoryNode(child, node.id, idx + 1));
}

function ensureRichCategories() {
  const taxonomy = [
    {
      id: 'cat_realestate',
      name: 'عقارات',
      slug: 'real-estate',
      icon: 'Building2',
      children: [
        {
          id: 'cat_realestate_sale',
          name: 'للبيع',
          slug: 'real-estate-sale',
          children: [
            {
              id: 'cat_realestate_sale_res',
              name: 'سكن',
              slug: 'real-estate-sale-residential',
              children: [
                { id: 'cat_apartment_sale', name: 'شقة', slug: 'apartment-sale' },
                { id: 'cat_villa_sale', name: 'فيلا', slug: 'villa-sale' },
                { id: 'cat_floor_sale', name: 'دور', slug: 'floor-sale' },
                { id: 'cat_land_sale', name: 'أرض', slug: 'land-sale' },
              ],
            },
            {
              id: 'cat_realestate_sale_commercial',
              name: 'تجاري',
              slug: 'real-estate-sale-commercial',
              children: [
                { id: 'cat_office_sale', name: 'مكتب', slug: 'office-sale' },
                { id: 'cat_shop_sale', name: 'محل', slug: 'shop-sale' },
                { id: 'cat_warehouse_sale', name: 'مستودع', slug: 'warehouse-sale' },
              ],
            },
          ],
        },
        {
          id: 'cat_realestate_rent',
          name: 'للإيجار',
          slug: 'real-estate-rent',
          children: [
            {
              id: 'cat_realestate_rent_res',
              name: 'سكن',
              slug: 'real-estate-rent-residential',
              children: [
                { id: 'cat_apartment_rent', name: 'شقة', slug: 'apartment-rent' },
                { id: 'cat_villa_rent', name: 'فيلا', slug: 'villa-rent' },
                { id: 'cat_room_rent', name: 'غرفة', slug: 'room-rent' },
              ],
            },
            {
              id: 'cat_realestate_rent_commercial',
              name: 'تجاري',
              slug: 'real-estate-rent-commercial',
              children: [
                { id: 'cat_office_rent', name: 'مكتب', slug: 'office-rent' },
                { id: 'cat_shop_rent', name: 'محل', slug: 'shop-rent' },
                { id: 'cat_warehouse_rent', name: 'مستودع', slug: 'warehouse-rent' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'cat_cars',
      name: 'سيارات',
      slug: 'cars',
      icon: 'Car',
      children: [
        {
          id: 'cat_cars_cars',
          name: 'سيارات',
          slug: 'cars-main',
          children: [
            { id: 'cat_cars_sedan', name: 'سيدان', slug: 'sedan' },
            { id: 'cat_cars_suv', name: 'SUV', slug: 'suv' },
            { id: 'cat_cars_pickup', name: 'بيك أب', slug: 'pickup' },
            { id: 'cat_cars_hatchback', name: 'هاتشباك', slug: 'hatchback' },
            { id: 'cat_cars_van', name: 'فان', slug: 'van' },
            { id: 'cat_cars_luxury', name: 'فاخرة', slug: 'luxury-cars' },
            { id: 'cat_cars_electric', name: 'كهربائية', slug: 'electric-cars' },
            { id: 'cat_cars_hybrid', name: 'هجين', slug: 'hybrid-cars' },
          ],
        },
        {
          id: 'cat_motorcycles',
          name: 'دراجات',
          slug: 'motorcycles',
          children: [
            { id: 'cat_motorcycles_sport', name: 'رياضية', slug: 'sport-bike' },
            { id: 'cat_motorcycles_scooter', name: 'سكوتر', slug: 'scooter' },
          ],
        },
        {
          id: 'cat_trucks',
          name: 'شاحنات',
          slug: 'trucks',
          children: [
            { id: 'cat_trucks_light', name: 'خفيفة', slug: 'light-truck' },
            { id: 'cat_trucks_heavy', name: 'ثقيلة', slug: 'heavy-truck' },
          ],
        },
      ],
    },
    {
      id: 'cat_parts',
      name: 'قطع غيار',
      slug: 'parts',
      icon: 'Wrench',
      children: [
        {
          id: 'cat_parts_vehicle',
          name: 'سيارات ودفع رباعي',
          slug: 'vehicle-parts',
          children: [
            { id: 'cat_parts_engine', name: 'محرك', slug: 'engine-parts' },
            { id: 'cat_parts_electric', name: 'كهرباء', slug: 'electric-parts' },
            { id: 'cat_parts_brakes', name: 'فرامل', slug: 'brakes-parts' },
            { id: 'cat_parts_body', name: 'هيكل', slug: 'body-parts' },
            { id: 'cat_parts_tires', name: 'إطارات', slug: 'tires' },
            { id: 'cat_parts_battery', name: 'بطاريات', slug: 'batteries' },
          ],
        },
        {
          id: 'cat_parts_motorcycle',
          name: 'دراجات',
          slug: 'motorcycle-parts',
          children: [
            { id: 'cat_parts_motorcycle_general', name: 'قطع عامة', slug: 'motorcycle-general-parts' },
          ],
        },
      ],
    },
    {
      id: 'cat_jobs',
      name: 'وظائف',
      slug: 'jobs',
      icon: 'Briefcase',
      children: [
        {
          id: 'cat_jobs_tech',
          name: 'تقنية',
          slug: 'tech-jobs',
          children: [
            { id: 'cat_jobs_dev', name: 'مطور برمجيات', slug: 'software-developer-jobs' },
            { id: 'cat_jobs_qa', name: 'اختبار جودة', slug: 'qa-jobs' },
            { id: 'cat_jobs_devops', name: 'DevOps', slug: 'devops-jobs' },
            { id: 'cat_jobs_data', name: 'بيانات', slug: 'data-jobs' },
          ],
        },
        {
          id: 'cat_jobs_business',
          name: 'إدارية ومبيعات',
          slug: 'business-jobs',
          children: [
            { id: 'cat_jobs_sales', name: 'مبيعات', slug: 'sales-jobs' },
            { id: 'cat_jobs_hr', name: 'موارد بشرية', slug: 'hr-jobs' },
            { id: 'cat_jobs_accounting', name: 'محاسبة', slug: 'accounting-jobs' },
          ],
        },
      ],
    },
    {
      id: 'cat_services',
      name: 'خدمات',
      slug: 'services',
      icon: 'Handshake',
      children: [
        { id: 'cat_services_transport', name: 'نقل وشحن', slug: 'transport-services' },
        { id: 'cat_services_maintenance', name: 'صيانة', slug: 'maintenance-services' },
        { id: 'cat_services_cleaning', name: 'تنظيف', slug: 'cleaning-services' },
        { id: 'cat_services_design', name: 'تصميم', slug: 'design-services' },
        { id: 'cat_services_education', name: 'تعليم وتدريب', slug: 'education-services' },
      ],
    },
    {
      id: 'cat_electronics',
      name: 'إلكترونيات',
      slug: 'electronics',
      icon: 'Smartphone',
      children: [
        { id: 'cat_phone', name: 'هواتف', slug: 'phones' },
        { id: 'cat_tablets', name: 'أجهزة لوحية', slug: 'tablets' },
        { id: 'cat_computers', name: 'كمبيوتر', slug: 'computers' },
        { id: 'cat_tvs', name: 'تلفزيونات', slug: 'tvs' },
        { id: 'cat_cameras', name: 'كاميرات', slug: 'cameras' },
        { id: 'cat_gaming', name: 'ألعاب', slug: 'gaming' },
      ],
    },
    {
      id: 'cat_furniture',
      name: 'أثاث',
      slug: 'furniture',
      icon: 'Sofa',
      children: [
        { id: 'cat_furniture_living', name: 'غرفة المعيشة', slug: 'living-room-furniture' },
        { id: 'cat_furniture_bedroom', name: 'غرفة النوم', slug: 'bedroom-furniture' },
        { id: 'cat_furniture_office', name: 'أثاث مكتبي', slug: 'office-furniture' },
        { id: 'cat_furniture_kitchen', name: 'المطبخ', slug: 'kitchen-furniture' },
      ],
    },
    {
      id: 'cat_fashion',
      name: 'أزياء',
      slug: 'fashion',
      icon: 'Shirt',
      children: [
        { id: 'cat_fashion_men', name: 'رجالي', slug: 'men-fashion' },
        { id: 'cat_fashion_women', name: 'نسائي', slug: 'women-fashion' },
        { id: 'cat_fashion_kids', name: 'أطفال', slug: 'kids-fashion' },
        { id: 'cat_fashion_accessories', name: 'اكسسوارات', slug: 'fashion-accessories' },
      ],
    },
    {
      id: 'cat_pets',
      name: 'حيوانات',
      slug: 'pets',
      icon: 'PawPrint',
      children: [
        { id: 'cat_pets_cats', name: 'قطط', slug: 'cats' },
        { id: 'cat_pets_dogs', name: 'كلاب', slug: 'dogs' },
        { id: 'cat_pets_birds', name: 'طيور', slug: 'birds' },
        { id: 'cat_pets_fish', name: 'أسماك', slug: 'fish' },
        { id: 'cat_pets_supplies', name: 'مستلزمات', slug: 'pets-supplies' },
      ],
    },
  ];

  taxonomy.forEach((root, idx) => insertCategoryNode(root, null, idx + 1));
  rebuildCategoryClosure();
}

function ensureRichFields() {
  const fields = [
    ['f_brand', 'brand', 'الماركة', 'select', null, 0, JSON.stringify(['Toyota', 'Jeep', 'BMW', 'Mercedes', 'Hyundai', 'Kia', 'Nissan', 'Ford', 'Chevrolet', 'Lexus']), '{}', 1, 1, 1],
    ['f_model', 'model', 'الموديل', 'text', 'مثال: رانجلر', 0, null, '{}', 2, 1, 1],
    ['f_year', 'year', 'سنة الصنع', 'number', '2025', 0, null, '{"min":1950,"max":2035}', 3, 1, 1],
    ['f_fuel', 'fuel', 'الوقود', 'select', null, 0, JSON.stringify(['بنزين', 'ديزل', 'هجين', 'كهربائي']), '{}', 4, 1, 1],
    ['f_transmission', 'transmission', 'القير', 'select', null, 0, JSON.stringify(['أوتوماتيك', 'عادي']), '{}', 5, 1, 0],
    ['f_color', 'color', 'اللون', 'text', null, 0, null, '{}', 6, 1, 0],
    ['f_mileage', 'mileage', 'العداد', 'number', null, 0, null, '{"min":0}', 7, 1, 0],
    ['f_condition', 'condition', 'الحالة', 'select', null, 0, JSON.stringify(['جديد', 'مستعمل']), '{}', 8, 1, 1],

    ['f_area', 'area', 'المساحة', 'number', 'متر مربع', 0, null, '{"min":1}', 20, 1, 1],
    ['f_rooms', 'rooms', 'عدد الغرف', 'number', null, 0, null, '{"min":0,"max":20}', 21, 1, 1],
    ['f_bathrooms', 'bathrooms', 'عدد الحمامات', 'number', null, 0, null, '{"min":0,"max":20}', 22, 1, 1],
    ['f_furnished', 'furnished', 'مفروش', 'boolean', null, 0, null, '{}', 23, 1, 0],
    ['f_floor', 'floor', 'الطابق', 'number', null, 0, null, '{}', 24, 1, 0],
    ['f_property_age', 'property_age', 'عمر العقار', 'number', null, 0, null, '{}', 25, 1, 0],

    ['f_part_type', 'part_type', 'نوع القطعة', 'text', null, 0, null, '{}', 30, 1, 1],
    ['f_compatibility', 'compatibility', 'التوافق', 'text', null, 0, null, '{}', 31, 1, 1],

    ['f_job_type', 'job_type', 'نوع الوظيفة', 'select', null, 0, JSON.stringify(['دوام كامل', 'دوام جزئي', 'عن بعد']), '{}', 40, 1, 1],
    ['f_experience', 'experience', 'الخبرة', 'select', null, 0, JSON.stringify(['مبتدئ', 'متوسط', 'متقدم']), '{}', 41, 1, 1],
    ['f_salary', 'salary', 'الراتب', 'number', null, 0, null, '{"min":0}', 42, 1, 1],

    ['f_service_type', 'service_type', 'نوع الخدمة', 'text', null, 0, null, '{}', 50, 1, 1],
    ['f_delivery_time', 'delivery_time', 'مدة التنفيذ', 'select', null, 0, JSON.stringify(['خلال يوم', 'خلال 3 أيام', 'خلال أسبوع']), '{}', 51, 1, 1],

    ['f_storage', 'storage', 'السعة', 'select', null, 0, JSON.stringify(['64GB', '128GB', '256GB', '512GB', '1TB']), '{}', 60, 1, 1],
    ['f_ram', 'ram', 'الرام', 'select', null, 0, JSON.stringify(['4GB', '8GB', '16GB', '32GB']), '{}', 61, 1, 1],
    ['f_screen', 'screen', 'حجم الشاشة', 'text', null, 0, null, '{}', 62, 1, 1],
    ['f_warranty', 'warranty', 'ضمان', 'boolean', null, 0, null, '{}', 63, 1, 1],

    ['f_pet_age', 'pet_age', 'العمر', 'number', null, 0, null, '{"min":0}', 70, 1, 1],
    ['f_gender', 'gender', 'الجنس', 'select', null, 0, JSON.stringify(['ذكر', 'أنثى']), '{}', 71, 1, 1],
  ];

  for (const field of fields) {
    run(
      'INSERT OR IGNORE INTO custom_fields (id,field_key,label,type,placeholder,required,options_json,validation_json,sort_order,is_filterable,is_searchable,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      field,
    );
  }
}

function mapFieldsForCategoryAndChildren(categoryId, fieldIds) {
  const descendants = getCategoryDescendants(categoryId, true).filter((d) => Number(d.depth) > 0);
  const targets = descendants.length > 0 ? descendants.map((d) => d.id) : [categoryId];
  for (const catId of targets) {
    fieldIds.forEach((fieldId, idx) => {
      run('INSERT OR IGNORE INTO category_field_map (category_id,field_id,sort_order) VALUES (?,?,?)', [catId, fieldId, idx + 1]);
    });
  }
}

function ensureRichFieldMapping() {
  mapFieldsForCategoryAndChildren('cat_cars', ['f_brand', 'f_model', 'f_year', 'f_fuel', 'f_transmission', 'f_color', 'f_mileage', 'f_condition']);
  mapFieldsForCategoryAndChildren('cat_parts', ['f_part_type', 'f_brand', 'f_compatibility', 'f_condition']);
  mapFieldsForCategoryAndChildren('cat_realestate', ['f_area', 'f_rooms', 'f_bathrooms', 'f_furnished', 'f_floor', 'f_property_age', 'f_condition']);
  mapFieldsForCategoryAndChildren('cat_jobs', ['f_job_type', 'f_experience', 'f_salary']);
  mapFieldsForCategoryAndChildren('cat_services', ['f_service_type', 'f_delivery_time', 'f_condition']);
  mapFieldsForCategoryAndChildren('cat_electronics', ['f_brand', 'f_model', 'f_storage', 'f_ram', 'f_screen', 'f_warranty', 'f_condition']);
  mapFieldsForCategoryAndChildren('cat_furniture', ['f_condition', 'f_color']);
  mapFieldsForCategoryAndChildren('cat_fashion', ['f_condition', 'f_color']);
  mapFieldsForCategoryAndChildren('cat_pets', ['f_pet_age', 'f_gender', 'f_condition']);
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCreatedAt() {
  const days = randomInt(0, 270);
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function randomPriceForCategory(catSlug) {
  if (catSlug.includes('sale') || catSlug.includes('land') || catSlug.includes('villa') || catSlug.includes('office')) return randomInt(150000, 3500000);
  if (catSlug.includes('rent')) return randomInt(900, 22000);
  if (catSlug.includes('cars') || catSlug.includes('suv') || catSlug.includes('sedan') || catSlug.includes('pickup') || catSlug.includes('truck')) return randomInt(9000, 420000);
  if (catSlug.includes('parts')) return randomInt(50, 9000);
  if (catSlug.includes('job')) return randomInt(2500, 25000);
  if (catSlug.includes('electronics')) return randomInt(250, 20000);
  if (catSlug.includes('furniture') || catSlug.includes('fashion')) return randomInt(60, 18000);
  if (catSlug.includes('pets')) return randomInt(100, 7000);
  return randomInt(80, 30000);
}

function randomTitleForCategory(category) {
  const prefixes = ['مميز', 'فرصة', 'إعلان مباشر', 'عرض خاص', 'بحالة ممتازة'];
  return `${randomItem(prefixes)} - ${category.name}`;
}

function randomDescriptionForCategory(category) {
  const snippets = [
    'تفاصيل دقيقة وصور واضحة والتواصل مباشر.',
    'سعر قابل للتفاوض بشكل معقول.',
    'متوفر الآن مع إمكانية المعاينة.',
    'إعلان موثوق وتمت إضافة كل المواصفات.',
  ];
  return `${category.name} ${randomItem(snippets)}`;
}

function randomFieldValue(field, category) {
  const type = String(field.type);
  const catSlug = String(category.slug);
  if (type === 'number') {
    if (field.field_key === 'year') return { number: randomInt(2008, 2026) };
    if (field.field_key === 'mileage') return { number: randomInt(0, 240000) };
    if (field.field_key === 'area') return { number: randomInt(40, 900) };
    if (field.field_key === 'rooms') return { number: randomInt(1, 9) };
    if (field.field_key === 'bathrooms') return { number: randomInt(1, 7) };
    if (field.field_key === 'salary') return { number: randomInt(3000, 28000) };
    if (field.field_key === 'pet_age') return { number: randomInt(1, 12) };
    return { number: randomInt(1, 500) };
  }
  if (type === 'boolean' || type === 'checkbox') return { bool: Math.random() > 0.5 ? 1 : 0 };
  if (field.options_json) {
    const options = JSON.parse(String(field.options_json));
    if (Array.isArray(options) && options.length > 0) return { text: String(randomItem(options)) };
  }
  if (field.field_key === 'model') {
    if (catSlug.includes('suv')) return { text: randomItem(['رانجلر', 'برادو', 'تاهو', 'إكسبلورر']) };
    if (catSlug.includes('sedan')) return { text: randomItem(['كامري', 'سوناتا', 'أكورد', 'مازدا 6']) };
    return { text: randomItem(['موديل A', 'موديل B', 'موديل C']) };
  }
  if (field.field_key === 'service_type') return { text: randomItem(['تركيب', 'صيانة', 'نقل', 'تنظيف']) };
  if (field.field_key === 'part_type') return { text: randomItem(['شاحن', 'كمبروسر', 'فلتر', 'طرمبة']) };
  if (field.field_key === 'compatibility') return { text: randomItem(['تويوتا', 'هيونداي', 'نيسان', 'فورد']) };
  if (field.field_key === 'screen') return { text: randomItem(['6.1"', '6.7"', '13"', '15.6"', '55"']) };
  if (field.field_key === 'color') return { text: randomItem(['أبيض', 'أسود', 'فضي', 'أزرق', 'أحمر']) };
  return { text: `${category.name} ${field.label}` };
}

function ensureBulkAds(minPublishedCount = 1200) {
  const currentPublished = Number(one("SELECT COUNT(*) AS n FROM ads WHERE status='published'")?.n ?? 0);
  if (currentPublished >= minPublishedCount) return;

  const cities = all('SELECT id FROM cities WHERE is_active=1');
  const leaves = all(`
    SELECT c.id,c.name,c.slug
    FROM categories c
    WHERE c.is_active=1
      AND NOT EXISTS (SELECT 1 FROM categories x WHERE x.parent_id = c.id AND x.is_active=1)
    ORDER BY c.sort_order ASC
  `);
  if (cities.length === 0 || leaves.length === 0) return;

  const fieldsByCategory = new Map();
  const rows = all(`
    SELECT m.category_id, cf.id, cf.field_key, cf.label, cf.type, cf.options_json
    FROM category_field_map m
    JOIN custom_fields cf ON cf.id = m.field_id
    WHERE cf.is_active=1
  `);
  for (const row of rows) {
    if (!fieldsByCategory.has(row.category_id)) fieldsByCategory.set(row.category_id, []);
    fieldsByCategory.get(row.category_id).push(row);
  }

  const toInsert = minPublishedCount - currentPublished;
  for (let i = 0; i < toInsert; i += 1) {
    const cat = leaves[i % leaves.length];
    const city = randomItem(cities);
    const id = uid();
    run('INSERT INTO ads (id,user_id,title,description,price,city_id,status,is_featured,created_at,category_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [
      id,
      i % 2 === 0 ? 'u1' : 'u2',
      randomTitleForCategory(cat),
      randomDescriptionForCategory(cat),
      randomPriceForCategory(String(cat.slug)),
      city.id,
      'published',
      Math.random() > 0.87 ? 1 : 0,
      randomCreatedAt(),
      cat.id,
    ]);

    const catFields = fieldsByCategory.get(cat.id) ?? [];
    for (const field of catFields) {
      const value = randomFieldValue(field, cat);
      setAdFieldValue(id, field.id, value);
    }
  }
}

function ensureRichCatalogSeed() {
  ensureRichCategories();
  ensureRichFields();
  ensureRichFieldMapping();
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
      ['makkah', 'مكة', 'الغربية'],
      ['madinah', 'المدينة المنورة', 'الغربية'],
      ['khobar', 'الخبر', 'الشرقية'],
      ['taif', 'الطائف', 'الغربية'],
      ['abha', 'أبها', 'الجنوبية'],
      ['tabuk', 'تبوك', 'الشمالية'],
      ['hail', 'حائل', 'الشمالية'],
      ['najran', 'نجران', 'الجنوبية'],
      ['jazan', 'جازان', 'الجنوبية'],
      ['qassim', 'القصيم', 'الوسطى'],
      ['jubail', 'الجبيل', 'الشرقية'],
      ['yanbu', 'ينبع', 'الغربية'],
    ];
    for (const [id, name, region] of cities) run('INSERT INTO cities (id,name,region,is_active) VALUES (?,?,?,1)', [id, name, region]);
  } else {
    const extraCities = [
      ['makkah', 'مكة', 'الغربية'],
      ['madinah', 'المدينة المنورة', 'الغربية'],
      ['khobar', 'الخبر', 'الشرقية'],
      ['taif', 'الطائف', 'الغربية'],
      ['abha', 'أبها', 'الجنوبية'],
      ['tabuk', 'تبوك', 'الشمالية'],
      ['hail', 'حائل', 'الشمالية'],
      ['najran', 'نجران', 'الجنوبية'],
      ['jazan', 'جازان', 'الجنوبية'],
      ['qassim', 'القصيم', 'الوسطى'],
      ['jubail', 'الجبيل', 'الشرقية'],
      ['yanbu', 'ينبع', 'الغربية'],
    ];
    for (const [id, name, region] of extraCities) {
      run('INSERT OR IGNORE INTO cities (id,name,region,is_active) VALUES (?,?,?,1)', [id, name, region]);
    }
  }

  ensureRichCatalogSeed();

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
  }

  ensureBulkAds(1200);
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
  const where = [];
  const binds = [];

  const requestedStatus = String(params.status || 'published').toLowerCase();
  const allowedStatuses = new Set(['published', 'sold', 'archived', 'pending', 'rejected', 'draft']);
  const effectiveStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : 'published';
  where.push('a.status = ?');
  binds.push(effectiveStatus);

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
  if (params.date_from) {
    where.push('a.created_at >= ?');
    binds.push(String(params.date_from));
  }
  if (params.date_to) {
    where.push('a.created_at <= ?');
    binds.push(String(params.date_to));
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
