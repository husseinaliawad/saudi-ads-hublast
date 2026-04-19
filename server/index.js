import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import {
  initDb,
  createUser,
  verifyUser,
  getUserById,
  dashboardData,
  setAdStatus,
  setAdFeatured,
  removeAd,
  setReportStatus,
  activateOrder,
  createCategory,
  createCity,
  toggleCategory,
  toggleCity,
  createAd,
  listUsers,
  toggleUserAdmin,
  toggleUserActive,
  resetUserPassword,
  listMessages,
  sendMessage,
  deleteMessage,
  getCategoryRoots,
  listCitiesPublic,
  getCategoryChildren,
  getCategoryById,
  getCategoryBySlug,
  getCategoryBreadcrumb,
  getCategoryDescendants,
  getCategoryFields,
  getFiltersForCategory,
  getAdsWithFilters,
  createAdWithFields,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 10000);
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(express.json());

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, is_admin: !!user.is_admin }, jwtSecret, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  return next();
}

// Auth
app.post('/api/auth/sign-up', (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
  const result = createUser({ email, password, fullName: full_name });
  if (result.error) return res.status(400).json({ error: result.error });
  const token = signToken(result.user);
  return res.json({ user: result.user, token });
});

app.post('/api/auth/sign-in', (req, res) => {
  const { email, password } = req.body || {};
  const user = verifyUser(email || '', password || '');
  if (!user) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
  const token = signToken(user);
  return res.json({ user, token });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = getUserById(req.user.sub);
  if (!user) return res.status(401).json({ error: 'User not found' });
  return res.json({ user });
});

// Taxonomy hierarchy
app.get('/api/categories/tree', (_req, res) => {
  const roots = getCategoryRoots();
  return res.json({ roots });
});

app.get('/api/cities', (_req, res) => {
  return res.json({ items: listCitiesPublic() });
});

app.get('/api/categories/:id/children', (req, res) => {
  return res.json({ items: getCategoryChildren(req.params.id) });
});

app.get('/api/categories/:id/breadcrumb', (req, res) => {
  return res.json({ items: getCategoryBreadcrumb(req.params.id) });
});

app.get('/api/categories/:id/fields', (req, res) => {
  return res.json({ items: getCategoryFields(req.params.id) });
});

app.get('/api/categories/:id/descendants', (req, res) => {
  return res.json({ items: getCategoryDescendants(req.params.id, true) });
});

app.get('/api/categories/slug/:slug', (req, res) => {
  const item = getCategoryBySlug(req.params.slug);
  if (!item) return res.status(404).json({ error: 'Not found' });
  return res.json({ item });
});

app.get('/api/categories/:id/filters', (req, res) => {
  return res.json({ items: getFiltersForCategory(req.params.id) });
});

// Ads browsing + creation with dynamic fields
app.get('/api/ads', (req, res) => {
  const dynamicFilters = {};
  const reserved = new Set(['q', 'category', 'city', 'price_min', 'price_max', 'featured', 'sort', 'page', 'page_size', 'date_from', 'date_to', 'status']);
  Object.entries(req.query).forEach(([k, v]) => {
    if (reserved.has(k)) return;
    if (k.startsWith('f_')) dynamicFilters[k.slice(2)] = v;
    else dynamicFilters[k] = v;
  });
  const result = getAdsWithFilters({
    q: req.query.q,
    category: req.query.category,
    city: req.query.city,
    price_min: req.query.price_min,
    price_max: req.query.price_max,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    status: req.query.status,
    featured: req.query.featured,
    sort: req.query.sort,
    page: req.query.page,
    page_size: req.query.page_size,
    dynamic_filters: dynamicFilters,
  });
  return res.json(result);
});

app.post('/api/ads', auth, (req, res) => {
  const { title, category_id } = req.body || {};
  if (!title || !category_id) return res.status(400).json({ error: 'Missing title/category_id' });
  const adId = createAdWithFields({ ...req.body, user_id: req.user.sub, status: 'published' });
  return res.json({ id: adId });
});

// Admin dashboard
app.get('/api/admin/dashboard', auth, adminOnly, (_req, res) => {
  return res.json(dashboardData());
});

app.post('/api/admin/ads/:id/status', auth, adminOnly, (req, res) => {
  setAdStatus(req.params.id, req.body?.status);
  return res.json({ ok: true });
});

app.post('/api/admin/ads/:id/featured', auth, adminOnly, (req, res) => {
  setAdFeatured(req.params.id, !!req.body?.is_featured);
  return res.json({ ok: true });
});

app.delete('/api/admin/ads/:id', auth, adminOnly, (req, res) => {
  removeAd(req.params.id);
  return res.json({ ok: true });
});

app.post('/api/admin/ads', auth, adminOnly, (req, res) => {
  const adId = createAd(req.body || {});
  return res.json({ ok: true, id: adId });
});

app.post('/api/admin/reports/:id/resolve', auth, adminOnly, (req, res) => {
  setReportStatus(req.params.id, req.body?.status || 'resolved');
  return res.json({ ok: true });
});

app.post('/api/admin/orders/:id/activate', auth, adminOnly, (req, res) => {
  activateOrder(req.params.id);
  return res.json({ ok: true });
});

app.post('/api/admin/categories', auth, adminOnly, (req, res) => {
  createCategory(req.body);
  return res.json({ ok: true });
});

app.post('/api/admin/cities', auth, adminOnly, (req, res) => {
  createCity(req.body);
  return res.json({ ok: true });
});

app.post('/api/admin/categories/:id/toggle', auth, adminOnly, (req, res) => {
  toggleCategory(req.params.id);
  return res.json({ ok: true });
});

app.post('/api/admin/cities/:id/toggle', auth, adminOnly, (req, res) => {
  toggleCity(req.params.id);
  return res.json({ ok: true });
});

app.get('/api/admin/users', auth, adminOnly, (_req, res) => {
  return res.json({ users: listUsers() });
});

app.post('/api/admin/users/:id/toggle-admin', auth, adminOnly, (req, res) => {
  toggleUserAdmin(req.params.id);
  return res.json({ ok: true });
});

app.post('/api/admin/users/:id/toggle-active', auth, adminOnly, (req, res) => {
  toggleUserActive(req.params.id);
  return res.json({ ok: true });
});

app.post('/api/admin/users/:id/reset-password', auth, adminOnly, (req, res) => {
  const password = String(req.body?.password || '').trim();
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
  resetUserPassword(req.params.id, password);
  return res.json({ ok: true });
});

app.get('/api/admin/messages', auth, adminOnly, (_req, res) => {
  return res.json({ messages: listMessages() });
});

app.post('/api/admin/messages', auth, adminOnly, (req, res) => {
  const { sender_id, recipient_id, body } = req.body || {};
  if (!sender_id || !recipient_id || !body) return res.status(400).json({ error: 'Missing message fields' });
  const id = sendMessage({ sender_id, recipient_id, body });
  return res.json({ ok: true, id });
});

app.delete('/api/admin/messages/:id', auth, adminOnly, (req, res) => {
  deleteMessage(req.params.id);
  return res.json({ ok: true });
});

const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

await initDb();
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
