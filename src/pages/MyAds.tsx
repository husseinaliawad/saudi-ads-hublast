import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Archive, Eye, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, timeAgoAr } from '@/lib/format';
import { cityById } from '@/data/cities';
import { categoryById } from '@/data/categories';

interface MyAd {
  id: string;
  title: string;
  price: number;
  status: string;
  is_featured: boolean;
  views_count: number;
  city_id: string;
  category_id: string;
  created_at: string;
  ad_images: { image_url: string; sort_order: number }[];
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  published: { label: 'منشور', cls: 'bg-success/15 text-success' },
  pending:   { label: 'قيد المراجعة', cls: 'bg-featured/20 text-featured-foreground' },
  draft:     { label: 'مسودة', cls: 'bg-muted text-muted-foreground' },
  rejected:  { label: 'مرفوض', cls: 'bg-destructive/15 text-destructive' },
  sold:      { label: 'مُباع', cls: 'bg-primary-soft text-primary' },
  archived:  { label: 'مؤرشف', cls: 'bg-muted text-muted-foreground' },
};

const MyAds = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<MyAd[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ads')
      .select('id,title,price,status,is_featured,views_count,city_id,category_id,created_at, ad_images(image_url,sort_order)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error('تعذّر جلب الإعلانات');
    setAds((data as unknown as MyAd[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const archive = async (id: string) => {
    const { error } = await supabase.from('ads').update({ status: 'archived' }).eq('id', id);
    if (error) toast.error('فشلت العملية');
    else { toast.success('تمت الأرشفة'); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان؟')) return;
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) toast.error('فشل الحذف');
    else { toast.success('تم الحذف'); load(); }
  };

  return (
    <div className="container-app py-8 sm:py-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">إعلاناتي</h1>
          <p className="text-muted-foreground mt-1">إدارة جميع إعلاناتك من مكان واحد</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/post-ad"><Plus className="h-4 w-4" /> إضافة إعلان</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : ads.length === 0 ? (
        <div className="card-elevated p-12 text-center space-y-4">
          <h3 className="font-display text-xl font-extrabold">لا توجد إعلانات بعد</h3>
          <p className="text-muted-foreground">ابدأ بإضافة أول إعلان لك الآن.</p>
          <Button asChild><Link to="/post-ad" className="gap-2"><Plus className="h-4 w-4" /> أضف إعلانًا</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((a) => {
            const img = a.ad_images?.sort((x, y) => x.sort_order - y.sort_order)[0]?.image_url;
            const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: 'bg-muted' };
            return (
              <div key={a.id} className="card-elevated p-4 flex flex-col sm:flex-row gap-4">
                <Link to={`/ad/${a.id}`} className="shrink-0">
                  <div className="h-24 w-32 sm:h-20 sm:w-28 rounded-xl bg-muted overflow-hidden">
                    {img && <img src={img} alt={a.title} className="h-full w-full object-cover" />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/ad/${a.id}`} className="font-display font-bold line-clamp-1 hover:text-primary">
                      {a.title}
                    </Link>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-display font-extrabold text-primary">
                      <span className="num">{formatPrice(a.price)}</span> ر.س
                    </span>
                    <span>{categoryById(a.category_id)?.name_ar}</span>
                    <span>{cityById(a.city_id)?.name_ar}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> <span className="num">{a.views_count}</span></span>
                    <span>{timeAgoAr(a.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:flex-col sm:items-stretch">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link to={`/ad/${a.id}`}><Edit className="h-3.5 w-3.5" /> عرض</Link>
                  </Button>
                  {a.status === 'published' && !a.is_featured && (
                    <Button asChild variant="outline" size="sm" className="gap-1.5 text-featured-foreground border-featured/40 bg-featured/10 hover:bg-featured/20">
                      <Link to={`/featured?ad=${a.id}`}><Sparkles className="h-3.5 w-3.5" /> تمييز</Link>
                    </Button>
                  )}
                  {a.status !== 'archived' && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => archive(a.id)}>
                      <Archive className="h-3.5 w-3.5" /> أرشفة
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/5" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAds;
