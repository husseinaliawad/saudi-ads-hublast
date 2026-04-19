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
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatPrice, timeAgoAr } from '@/lib/format';

interface Stats {
  users: number;
  ads: number;
  featured: number;
  reports: number;
  orders: number;
  messages: number;
}

interface AdRow {
  id: string;
  title: string;
  price: number;
  status: string;
  is_featured: boolean;
  created_at: string;
}

interface ReportRow {
  id: string;
  ad_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

interface OrderRow {
  id: string;
  ad_id: string;
  plan_id: string;
  status: string;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name_ar: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CityRow {
  id: string;
  name_ar: string;
  region: string;
  is_active: boolean;
}

interface AdminLogRow {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
}

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<AdRow[]>([]);
  const [allAds, setAllAds] = useState<AdRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCityRegion, setNewCityRegion] = useState('الوسطى');

  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const rootCategoriesCount = topCategories.length;

  const load = async () => {
    setLoading(true);

    const [
      usersCount,
      adsCount,
      featuredCount,
      reportsCount,
      ordersCount,
      messagesCount,
      pendingAds,
      ads,
      reportsRes,
      ordersRes,
      categoriesRes,
      citiesRes,
      logsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('ads').select('id', { count: 'exact', head: true }),
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('is_featured', true),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('featured_ad_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('ads').select('id,title,price,status,is_featured,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      supabase.from('ads').select('id,title,price,status,is_featured,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('id,ad_id,reason,details,status,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('featured_ad_orders').select('id,ad_id,plan_id,status,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('categories').select('id,name_ar,slug,parent_id,sort_order,is_active').order('sort_order', { ascending: true }),
      supabase.from('cities').select('id,name_ar,region,is_active').order('name_ar', { ascending: true }),
      supabase.from('admin_logs').select('id,action,target_type,target_id,created_at').order('created_at', { ascending: false }).limit(100),
    ]);

    setStats({
      users: usersCount.count ?? 0,
      ads: adsCount.count ?? 0,
      featured: featuredCount.count ?? 0,
      reports: reportsCount.count ?? 0,
      orders: ordersCount.count ?? 0,
      messages: messagesCount.count ?? 0,
    });

    setPending((pendingAds.data ?? []) as AdRow[]);
    setAllAds((ads.data ?? []) as AdRow[]);
    setReports((reportsRes.data ?? []) as ReportRow[]);
    setOrders((ordersRes.data ?? []) as OrderRow[]);
    setCategories((categoriesRes.data ?? []) as CategoryRow[]);
    setCities((citiesRes.data ?? []) as CityRow[]);
    setLogs((logsRes.data ?? []) as AdminLogRow[]);

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      load();
    }
  }, [isAdmin]);

  const withBusy = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
    }
  };

  const updateAdStatus = async (id: string, status: 'published' | 'rejected' | 'archived') => {
    await withBusy(async () => {
      const { error } = await supabase.rpc('admin_set_ad_status', {
        p_ad_id: id,
        p_status: status,
        p_note: status === 'published' ? 'تمت المراجعة والموافقة' : null,
      });
      if (error) throw error;
    }, 'تم تحديث حالة الإعلان');
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await withBusy(async () => {
      const featuredUntil = !current
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : null;

      const { error } = await supabase.rpc('admin_toggle_ad_featured', {
        p_ad_id: id,
        p_is_featured: !current,
        p_featured_until: featuredUntil,
      });
      if (error) throw error;
    }, 'تم تحديث حالة التمييز');
  };

  const deleteAd = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان نهائيًا؟')) return;

    await withBusy(async () => {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
      await supabase.from('admin_logs').insert({
        admin_user_id: user.id,
        action: 'delete_ad',
        target_type: 'ad',
        target_id: id,
      });
    }, 'تم حذف الإعلان');
  };

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    await withBusy(async () => {
      const { error } = await supabase.from('reports').update({ status }).eq('id', id);
      if (error) throw error;
      await supabase.from('admin_logs').insert({
        admin_user_id: user.id,
        action: 'resolve_report',
        target_type: 'report',
        target_id: id,
        details: { status },
      });
    }, 'تم تحديث البلاغ');
  };

  const activateOrder = async (o: OrderRow) => {
    await withBusy(async () => {
      const { data: plan, error: planErr } = await supabase
        .from('featured_plans')
        .select('duration_days')
        .eq('id', o.plan_id)
        .maybeSingle();
      if (planErr) throw planErr;

      const days = plan?.duration_days ?? 7;
      const starts = new Date().toISOString();
      const ends = new Date(Date.now() + days * 86400000).toISOString();

      const { error: orderErr } = await supabase
        .from('featured_ad_orders')
        .update({ status: 'active', starts_at: starts, ends_at: ends })
        .eq('id', o.id);
      if (orderErr) throw orderErr;

      const { error: adErr } = await supabase.rpc('admin_toggle_ad_featured', {
        p_ad_id: o.ad_id,
        p_is_featured: true,
        p_featured_until: ends,
      });
      if (adErr) throw adErr;
    }, 'تم تفعيل التمييز');
  };

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (name.length < 2) return;

    const id = `${newCategoryParent || 'custom'}-${slugify(name)}`;

    await withBusy(async () => {
      const { error } = await supabase.from('categories').insert({
        id,
        name_ar: name,
        slug: id,
        parent_id: newCategoryParent || null,
        sort_order: categories.length + 100,
        icon: 'Tag',
        is_active: true,
      });
      if (error) throw error;
      setNewCategoryName('');
    }, 'تمت إضافة التصنيف');
  };

  const addCity = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCityName.trim();
    if (name.length < 2) return;

    await withBusy(async () => {
      const { error } = await supabase.from('cities').insert({
        id: slugify(name),
        name_ar: name,
        region: newCityRegion,
        is_active: true,
      });
      if (error) throw error;
      setNewCityName('');
    }, 'تمت إضافة المدينة');
  };

  const toggleCategoryActive = async (row: CategoryRow) => {
    await withBusy(async () => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
    }, 'تم تحديث التصنيف');
  };

  const toggleCityActive = async (row: CityRow) => {
    await withBusy(async () => {
      const { error } = await supabase
        .from('cities')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
    }, 'تم تحديث المدينة');
  };

  if (authLoading) {
    return (
      <div className="container-app py-20 grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="container-app py-20 text-center">يجب تسجيل الدخول.</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container-app py-20 text-center space-y-4 max-w-lg mx-auto">
        <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="font-display text-2xl font-extrabold">صلاحية مشرف مطلوبة</h1>
        <p className="text-muted-foreground">لا تملك صلاحية الوصول للوحة التحكم.</p>
        <Button asChild variant="outline">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="container-app py-20 grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <p className="text-muted-foreground mt-1">مراجعة الإعلانات، إدارة البيانات، وحوكمة المنصة</p>
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
          <TabsTrigger value="ads">كل الإعلانات</TabsTrigger>
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
                    <Link to={`/ad/${a.id}`} className="font-bold hover:text-primary truncate block">
                      {a.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      <span className="num">{formatPrice(a.price)}</span> ر.س · {timeAgoAr(a.created_at)}
                    </p>
                  </div>
                  <Button size="sm" className="gap-1" disabled={busy} onClick={() => updateAdStatus(a.id, 'published')}>
                    <Check className="h-4 w-4" /> قبول
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => updateAdStatus(a.id, 'rejected')}>
                    <X className="h-4 w-4" /> رفض
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ads" className="mt-6">
          <div className="space-y-3">
            {allAds.map((a) => (
              <div key={a.id} className="card-elevated p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <Link to={`/ad/${a.id}`} className="font-bold hover:text-primary truncate block">
                    {a.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {a.status} · <span className="num">{formatPrice(a.price)}</span> ر.س · {timeAgoAr(a.created_at)}
                    {a.is_featured && (
                      <span className="badge-featured mr-2">
                        <Sparkles className="h-3 w-3" /> مميز
                      </span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => toggleFeatured(a.id, a.is_featured)}>
                  <Sparkles className="h-4 w-4" /> {a.is_featured ? 'إلغاء التمييز' : 'تمييز'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={busy}
                  onClick={() => updateAdStatus(a.id, a.status === 'archived' ? 'published' : 'archived')}
                >
                  {a.status === 'archived' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {a.status === 'archived' ? 'إظهار' : 'إخفاء'}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-destructive" disabled={busy} onClick={() => deleteAd(a.id)}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا توجد بلاغات</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to={`/ad/${r.ad_id}`} className="font-bold text-primary hover:underline">
                        عرض الإعلان
                      </Link>
                      <p className="text-sm mt-1"><strong>السبب:</strong> {r.reason}</p>
                      {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{timeAgoAr(r.created_at)} · الحالة: {r.status}</p>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveReport(r.id, 'resolved')}>
                          حل
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => resolveReport(r.id, 'dismissed')}>
                          تجاهل
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا توجد طلبات</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="card-elevated p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <Link to={`/ad/${o.ad_id}`} className="font-bold hover:text-primary">
                      طلب على الإعلان
                    </Link>
                    <p className="text-sm text-muted-foreground">{o.status} · {timeAgoAr(o.created_at)}</p>
                  </div>
                  {o.status === 'pending' && (
                    <Button size="sm" className="gap-1" disabled={busy} onClick={() => activateOrder(o)}>
                      <Check className="h-4 w-4" /> تفعيل التمييز
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card-elevated p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold flex items-center gap-2">
                  <Shapes className="h-5 w-5 text-primary" /> التصنيفات
                </h3>
                <span className="text-xs text-muted-foreground">جذور: {rootCategoriesCount}</span>
              </div>

              <form onSubmit={addCategory} className="space-y-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اسم التصنيف"
                  className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={newCategoryParent}
                  onChange={(e) => setNewCategoryParent(e.target.value)}
                  className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">قسم رئيسي</option>
                  {topCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
                  ))}
                </select>
                <Button type="submit" size="sm" className="gap-1" disabled={busy || !newCategoryName.trim()}>
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </form>

              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cat.name_ar}</p>
                      <p className="text-xs text-muted-foreground truncate">{cat.slug}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleCategoryActive(cat)}>
                      {cat.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="card-elevated p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> المدن
                </h3>
                <span className="text-xs text-muted-foreground">العدد: {cities.length}</span>
              </div>

              <form onSubmit={addCity} className="space-y-2">
                <input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="اسم المدينة"
                  className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={newCityRegion}
                  onChange={(e) => setNewCityRegion(e.target.value)}
                  className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="الوسطى">الوسطى</option>
                  <option value="الغربية">الغربية</option>
                  <option value="الشرقية">الشرقية</option>
                  <option value="الجنوبية">الجنوبية</option>
                  <option value="الشمالية">الشمالية</option>
                </select>
                <Button type="submit" size="sm" className="gap-1" disabled={busy || !newCityName.trim()}>
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </form>

              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {cities.map((city) => (
                  <div key={city.id} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{city.name_ar}</p>
                      <p className="text-xs text-muted-foreground truncate">{city.region}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleCityActive(city)}>
                      {city.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا توجد عمليات مسجلة</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="card-elevated p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-primary" />
                        {log.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.target_type} · {log.target_id ?? '-'}
                      </p>
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
