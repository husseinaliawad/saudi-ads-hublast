import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  ShieldCheck,
  Users,
  Package,
  Flag,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Check,
  X,
  MessagesSquare,
  MapPin,
  Shapes,
  ScrollText,
  Plus,
  UserCog,
  Send,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, timeAgoAr } from '@/lib/format';
import { api } from '@/lib/api';

interface Stats { users: number; ads: number; featured: number; reports: number; orders: number; messages: number }
interface AdRow { id: string; title: string; price: number; status: string; is_featured: number | boolean; created_at: string }
interface ReportRow { id: string; ad_id: string; reason: string; details: string | null; status: string; created_at: string }
interface OrderRow { id: string; ad_id: string; plan_id: string; status: string; created_at: string }
interface CategoryRow { id: string; name_ar: string; slug: string; parent_id: string | null; sort_order: number; is_active: number | boolean }
interface CityRow { id: string; name_ar: string; region: string; is_active: number | boolean }
interface AdminLogRow { id: string; action: string; target_type: string; target_id: string | null; created_at: string }
interface UserRow { id: string; email: string; full_name: string; is_admin: number | boolean; is_active: number | boolean; created_at: string }
interface MessageRow { id: string; sender_id: string; recipient_id: string; body: string; is_read: number | boolean; created_at: string }

const slugify = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<AdRow[]>([]);
  const [allAds, setAllAds] = useState<AdRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [messagesList, setMessagesList] = useState<MessageRow[]>([]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'archived' | 'rejected'>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCityRegion, setNewCityRegion] = useState('الوسطى');
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdPrice, setNewAdPrice] = useState('');
  const [newAdDescription, setNewAdDescription] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  const [newAdCity, setNewAdCity] = useState('');
  const [newMsgRecipient, setNewMsgRecipient] = useState('');
  const [newMsgBody, setNewMsgBody] = useState('');
  const [resetPwdUserId, setResetPwdUserId] = useState('');
  const [resetPwdValue, setResetPwdValue] = useState('');

  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const filteredAds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAds.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    });
  }, [allAds, query, statusFilter]);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    usersList.forEach((u) => { map[u.id] = `${u.full_name} (${u.email})`; });
    return map;
  }, [usersList]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{
        stats: Stats;
        pending: AdRow[];
        allAds: AdRow[];
        reports: ReportRow[];
        orders: OrderRow[];
        categories: CategoryRow[];
        cities: CityRow[];
        logs: AdminLogRow[];
        usersList: UserRow[];
        messagesList: MessageRow[];
      }>('/api/admin/dashboard');

      setStats(data.stats);
      setPending(data.pending);
      setAllAds(data.allAds);
      setReports(data.reports);
      setOrders(data.orders);
      setCategories(data.categories);
      setCities(data.cities);
      setLogs(data.logs);
      setUsersList(data.usersList);
      setMessagesList(data.messagesList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const withBusy = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <div className="container-app py-20 text-center">يجب تسجيل الدخول.</div>;
  if (!isAdmin) {
    return (
      <div className="container-app py-20 text-center space-y-4 max-w-lg mx-auto">
        <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="font-display text-2xl font-extrabold">صلاحية مشرف مطلوبة</h1>
        <p className="text-muted-foreground">لا تملك صلاحية الوصول للوحة التحكم.</p>
        <Button asChild variant="outline"><Link to="/">العودة للرئيسية</Link></Button>
      </div>
    );
  }
  if (loading || !stats) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const StatCard = ({ icon: Icon, label, value, color = 'text-primary' }: { icon: typeof Users; label: string; value: number; color?: string }) => (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-extrabold mt-1 num">{value}</p>
        </div>
        <div className={cn('grid h-12 w-12 place-items-center rounded-xl bg-primary-soft', color)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-app py-8 sm:py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">تحكم شامل بالموقع: الإعلانات، المستخدمين، الرسائل، التصنيفات، والمدن.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="المستخدمون" value={stats.users} />
        <StatCard icon={Package} label="الإعلانات" value={stats.ads} />
        <StatCard icon={Sparkles} label="المميزة" value={stats.featured} />
        <StatCard icon={MessagesSquare} label="الرسائل" value={stats.messages} />
        <StatCard icon={Flag} label="بلاغات مفتوحة" value={stats.reports} />
        <StatCard icon={Sparkles} label="طلبات تمييز" value={stats.orders} />
      </div>

      <Tabs defaultValue="pending" dir="rtl">
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة ({pending.length})</TabsTrigger>
          <TabsTrigger value="ads">كل الإعلانات ({allAds.length})</TabsTrigger>
          <TabsTrigger value="create-ad">إضافة إعلان</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
          <TabsTrigger value="reports">البلاغات ({reports.filter((r) => r.status === 'open').length})</TabsTrigger>
          <TabsTrigger value="orders">طلبات التمييز</TabsTrigger>
          <TabsTrigger value="data">المدن والتصنيفات</TabsTrigger>
          <TabsTrigger value="logs">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا توجد إعلانات قيد المراجعة</p>
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <div key={a.id} className="card-elevated p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/ad/${a.id}`} className="font-bold hover:text-primary truncate block">{a.title}</Link>
                    <p className="text-sm text-muted-foreground"><span className="num">{formatPrice(a.price)}</span> ر.س · {timeAgoAr(a.created_at)}</p>
                  </div>
                  <Button size="sm" className="gap-1" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/ads/${a.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'published' }) }), 'تم قبول الإعلان')}>
                    <Check className="h-4 w-4" /> قبول
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/ads/${a.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'rejected' }) }), 'تم رفض الإعلان')}>
                    <X className="h-4 w-4" /> رفض
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ads" className="mt-6 space-y-4">
          <div className="card-elevated p-4 grid sm:grid-cols-3 gap-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بعنوان الإعلان أو المعرف" className="h-10 border border-input rounded-lg px-3 text-sm bg-background" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 border border-input rounded-lg px-3 text-sm bg-background">
              <option value="all">كل الحالات</option>
              <option value="pending">معلق</option>
              <option value="published">منشور</option>
              <option value="archived">مؤرشف</option>
              <option value="rejected">مرفوض</option>
            </select>
            <div className="text-sm text-muted-foreground flex items-center">النتائج: <span className="num mr-1">{filteredAds.length}</span></div>
          </div>

          <div className="space-y-3">
            {filteredAds.map((a) => (
              <div key={a.id} className="card-elevated p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <Link to={`/ad/${a.id}`} className="font-bold hover:text-primary truncate block">{a.title}</Link>
                  <p className="text-sm text-muted-foreground">{a.status} · <span className="num">{formatPrice(a.price)}</span> ر.س · {timeAgoAr(a.created_at)}</p>
                </div>

                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/ads/${a.id}/featured`, { method: 'POST', body: JSON.stringify({ is_featured: !Boolean(a.is_featured) }) }), 'تم تحديث التمييز')}>
                  <Sparkles className="h-4 w-4" /> {Boolean(a.is_featured) ? 'إلغاء التمييز' : 'تمييز'}
                </Button>

                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/ads/${a.id}/status`, { method: 'POST', body: JSON.stringify({ status: a.status === 'archived' ? 'published' : 'archived' }) }), 'تم تحديث الحالة')}>
                  {a.status === 'archived' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {a.status === 'archived' ? 'إظهار' : 'إخفاء'}
                </Button>

                <Button size="sm" variant="ghost" className="gap-1 text-destructive" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/ads/${a.id}`, { method: 'DELETE' }), 'تم حذف الإعلان')}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create-ad" className="mt-6">
          <section className="card-elevated p-5 space-y-3 max-w-3xl">
            <h3 className="font-display text-lg font-extrabold">إضافة إعلان من لوحة الأدمن</h3>
            <form
              className="grid sm:grid-cols-2 gap-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!newAdTitle.trim() || !newAdPrice.trim()) return;
                withBusy(
                  () =>
                    api('/api/admin/ads', {
                      method: 'POST',
                      body: JSON.stringify({
                        title: newAdTitle.trim(),
                        price: Number(newAdPrice),
                        description: newAdDescription.trim(),
                        category_id: newAdCategory || null,
                        city_id: newAdCity || null,
                        status: 'published',
                        is_featured: false,
                      }),
                    }),
                  'تمت إضافة الإعلان',
                );
                setNewAdTitle('');
                setNewAdPrice('');
                setNewAdDescription('');
              }}
            >
              <input value={newAdTitle} onChange={(e) => setNewAdTitle(e.target.value)} placeholder="عنوان الإعلان" className="h-10 border border-input rounded-lg px-3 text-sm bg-background sm:col-span-2" />
              <input value={newAdPrice} onChange={(e) => setNewAdPrice(e.target.value)} placeholder="السعر" className="h-10 border border-input rounded-lg px-3 text-sm bg-background" />
              <select value={newAdCategory} onChange={(e) => setNewAdCategory(e.target.value)} className="h-10 border border-input rounded-lg px-3 text-sm bg-background">
                <option value="">اختر التصنيف</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <select value={newAdCity} onChange={(e) => setNewAdCity(e.target.value)} className="h-10 border border-input rounded-lg px-3 text-sm bg-background">
                <option value="">اختر المدينة</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <textarea value={newAdDescription} onChange={(e) => setNewAdDescription(e.target.value)} placeholder="وصف الإعلان" className="sm:col-span-2 min-h-24 border border-input rounded-lg px-3 py-2 text-sm bg-background" />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy || !newAdTitle.trim() || !newAdPrice.trim()} className="gap-1"><Plus className="h-4 w-4" /> إضافة الإعلان</Button>
              </div>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <section className="card-elevated p-5 space-y-3">
            <h3 className="font-display text-lg font-extrabold flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /> إدارة المستخدمين</h3>
            <div className="space-y-2">
              {usersList.map((u) => (
                <div key={u.id} className="rounded-lg border border-border p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{u.is_admin ? 'Admin' : 'User'}</span>
                  <span className="text-xs text-muted-foreground">{u.is_active ? 'نشط' : 'موقوف'}</span>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/users/${u.id}/toggle-admin`, { method: 'POST' }), 'تم تحديث صلاحية المستخدم')}>
                    {u.is_admin ? 'إلغاء أدمن' : 'جعله أدمن'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/users/${u.id}/toggle-active`, { method: 'POST' }), 'تم تحديث حالة المستخدم')}>
                    {u.is_active ? 'إيقاف' : 'تفعيل'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    disabled={busy}
                    onClick={() => {
                      setResetPwdUserId(u.id);
                      setResetPwdValue('');
                    }}
                  >
                    <KeyRound className="h-4 w-4" /> إعادة كلمة المرور
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {resetPwdUserId && (
            <section className="card-elevated p-4 max-w-xl">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (resetPwdValue.trim().length < 6) return;
                  withBusy(
                    () => api(`/api/admin/users/${resetPwdUserId}/reset-password`, { method: 'POST', body: JSON.stringify({ password: resetPwdValue.trim() }) }),
                    'تم تغيير كلمة المرور',
                  );
                  setResetPwdUserId('');
                  setResetPwdValue('');
                }}
              >
                <input value={resetPwdValue} onChange={(e) => setResetPwdValue(e.target.value)} placeholder="كلمة المرور الجديدة" className="h-10 border border-input rounded-lg px-3 text-sm bg-background flex-1" />
                <Button type="submit" disabled={busy || resetPwdValue.trim().length < 6}>حفظ</Button>
                <Button type="button" variant="outline" onClick={() => setResetPwdUserId('')}>إلغاء</Button>
              </form>
            </section>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-6 space-y-4">
          <section className="card-elevated p-5 space-y-3">
            <h3 className="font-display text-lg font-extrabold flex items-center gap-2"><MessagesSquare className="h-5 w-5 text-primary" /> إدارة الرسائل</h3>
            <form
              className="grid sm:grid-cols-3 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMsgRecipient || !newMsgBody.trim() || !user?.id) return;
                withBusy(
                  () => api('/api/admin/messages', { method: 'POST', body: JSON.stringify({ sender_id: user.id, recipient_id: newMsgRecipient, body: newMsgBody.trim() }) }),
                  'تم إرسال الرسالة',
                );
                setNewMsgBody('');
              }}
            >
              <select value={newMsgRecipient} onChange={(e) => setNewMsgRecipient(e.target.value)} className="h-10 border border-input rounded-lg px-3 text-sm bg-background">
                <option value="">اختر المستلم</option>
                {usersList.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <input value={newMsgBody} onChange={(e) => setNewMsgBody(e.target.value)} placeholder="اكتب الرسالة" className="h-10 border border-input rounded-lg px-3 text-sm bg-background sm:col-span-2" />
              <div className="sm:col-span-3">
                <Button type="submit" disabled={busy || !newMsgRecipient || !newMsgBody.trim()} className="gap-1"><Send className="h-4 w-4" /> إرسال</Button>
              </div>
            </form>

            <div className="space-y-2">
              {messagesList.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">من: {userMap[m.sender_id] ?? m.sender_id} → إلى: {userMap[m.recipient_id] ?? m.recipient_id}</p>
                    <p className="text-sm truncate">{m.body}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgoAr(m.created_at)}</span>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => withBusy(() => api(`/api/admin/messages/${m.id}`, { method: 'DELETE' }), 'تم حذف الرسالة')}>حذف</Button>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? <p className="text-center text-muted-foreground py-10">لا توجد بلاغات</p> : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to={`/ad/${r.ad_id}`} className="font-bold text-primary hover:underline">عرض الإعلان</Link>
                      <p className="text-sm mt-1"><strong>السبب:</strong> {r.reason}</p>
                      {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{timeAgoAr(r.created_at)} · الحالة: {r.status}</p>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/reports/${r.id}/resolve`, { method: 'POST', body: JSON.stringify({ status: 'resolved' }) }), 'تم حل البلاغ')}>حل</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/reports/${r.id}/resolve`, { method: 'POST', body: JSON.stringify({ status: 'dismissed' }) }), 'تم تجاهل البلاغ')}>تجاهل</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          {orders.length === 0 ? <p className="text-center text-muted-foreground py-10">لا توجد طلبات</p> : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="card-elevated p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/ad/${o.ad_id}`} className="font-bold hover:text-primary">طلب على الإعلان</Link>
                    <p className="text-sm text-muted-foreground">{o.status} · {timeAgoAr(o.created_at)}</p>
                  </div>
                  {o.status === 'pending' && <Button size="sm" className="gap-1" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/orders/${o.id}/activate`, { method: 'POST' }), 'تم تفعيل الطلب')}><Check className="h-4 w-4" /> تفعيل</Button>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card-elevated p-4 sm:p-5 space-y-4">
              <h3 className="font-display text-lg font-extrabold flex items-center gap-2"><Shapes className="h-5 w-5 text-primary" /> التصنيفات</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const name = newCategoryName.trim();
                if (!name) return;
                withBusy(() => api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ id: `${newCategoryParent || 'custom'}-${slugify(name)}`, name_ar: name, slug: slugify(name), parent_id: newCategoryParent || null, sort_order: categories.length + 10 }) }), 'تمت إضافة التصنيف');
                setNewCategoryName('');
              }} className="space-y-2">
                <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="اسم التصنيف" className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm" />
                <select value={newCategoryParent} onChange={(e) => setNewCategoryParent(e.target.value)} className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm">
                  <option value="">قسم رئيسي</option>
                  {topCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name_ar}</option>)}
                </select>
                <Button type="submit" size="sm" className="gap-1" disabled={busy || !newCategoryName.trim()}><Plus className="h-4 w-4" /> إضافة</Button>
              </form>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{cat.name_ar}</p><p className="text-xs text-muted-foreground truncate">{cat.slug}</p></div>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/categories/${cat.id}/toggle`, { method: 'POST' }), 'تم تحديث التصنيف')}>
                      {Number(cat.is_active) === 1 ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="card-elevated p-4 sm:p-5 space-y-4">
              <h3 className="font-display text-lg font-extrabold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> المدن</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const name = newCityName.trim();
                if (!name) return;
                withBusy(() => api('/api/admin/cities', { method: 'POST', body: JSON.stringify({ id: slugify(name), name_ar: name, region: newCityRegion }) }), 'تمت إضافة المدينة');
                setNewCityName('');
              }} className="space-y-2">
                <input value={newCityName} onChange={(e) => setNewCityName(e.target.value)} placeholder="اسم المدينة" className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm" />
                <select value={newCityRegion} onChange={(e) => setNewCityRegion(e.target.value)} className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm">
                  <option value="الوسطى">الوسطى</option>
                  <option value="الغربية">الغربية</option>
                  <option value="الشرقية">الشرقية</option>
                  <option value="الجنوبية">الجنوبية</option>
                  <option value="الشمالية">الشمالية</option>
                </select>
                <Button type="submit" size="sm" className="gap-1" disabled={busy || !newCityName.trim()}><Plus className="h-4 w-4" /> إضافة</Button>
              </form>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {cities.map((city) => (
                  <div key={city.id} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{city.name_ar}</p><p className="text-xs text-muted-foreground truncate">{city.region}</p></div>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => withBusy(() => api(`/api/admin/cities/${city.id}/toggle`, { method: 'POST' }), 'تم تحديث المدينة')}>
                      {Number(city.is_active) === 1 ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          {logs.length === 0 ? <p className="text-center text-muted-foreground py-10">لا توجد عمليات مسجلة</p> : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="card-elevated p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" />{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.target_type} · {log.target_id ?? '-'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgoAr(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
