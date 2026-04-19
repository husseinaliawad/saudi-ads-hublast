import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Heart, Share2, MessageCircle, Phone, ShieldCheck, Sparkles,
  Eye, Tag, Calendar, ChevronRight, ChevronLeft, Star, Loader2, Flag,
} from 'lucide-react';
import { cityById } from '@/data/cities';
import { categoryById } from '@/data/categories';
import { formatPrice, timeAgoAr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { AdCard } from '@/components/ads/AdCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { fetchAdById, fetchPublishedAds } from '@/lib/queries';
import { FavoriteButton } from '@/components/ads/FavoriteButton';
import { ReportDialog } from '@/components/ads/ReportDialog';
import type { Ad } from '@/types';

interface SellerInfo {
  id: string; full_name: string; phone: string | null; avatar_url: string | null;
  is_verified: boolean; rating_avg: number; rating_count: number;
}

const AdDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [similar, setSimilar] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const a = await fetchAdById(id);
        if (!a) { setLoading(false); return; }
        setAd(a);
        // increment views (fire and forget)
        supabase.from('ads').update({ views_count: a.views_count + 1 }).eq('id', a.id).then(() => {});
        const [{ data: s }, sim] = await Promise.all([
          supabase.from('profiles').select('id,full_name,phone,avatar_url,is_verified,rating_avg,rating_count').eq('id', a.user_id).maybeSingle(),
          fetchPublishedAds({ categoryId: a.category_id, limit: 5 }),
        ]);
        setSeller(s as SellerInfo);
        setSimilar(sim.filter((x) => x.id !== a.id).slice(0, 4));
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!ad) {
    return <div className="container-app py-20 text-center">
      <h2 className="font-display text-2xl font-extrabold">الإعلان غير موجود</h2>
      <Button asChild className="mt-4"><Link to="/browse">العودة للتصفح</Link></Button>
    </div>;
  }

  const city = cityById(ad.city_id);
  const cat = categoryById(ad.category_id);
  const isOwner = user?.id === ad.user_id;

  const next = () => setActiveImg((i) => (i + 1) % ad.images.length);
  const prev = () => setActiveImg((i) => (i - 1 + ad.images.length) % ad.images.length);

  const startConversation = async () => {
    if (!user) { navigate(`/auth?redirect=/ad/${ad.id}`); return; }
    if (isOwner) { toast.error('لا يمكنك مراسلة نفسك'); return; }
    setContacting(true);
    try {
      // find existing conversation
      const { data: existing } = await supabase.from('conversations')
        .select('id').eq('ad_id', ad.id).eq('buyer_id', user.id).eq('seller_id', ad.user_id).maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data, error } = await supabase.from('conversations')
          .insert({ ad_id: ad.id, buyer_id: user.id, seller_id: ad.user_id }).select('id').single();
        if (error) throw error;
        convId = data.id;
      }
      navigate(`/messages/${convId}`);
    } catch (e) {
      console.error(e);
      toast.error('تعذّر بدء المحادثة');
    } finally { setContacting(false); }
  };

  return (
    <div className="container-app py-6 sm:py-10">
      <nav className="text-sm text-muted-foreground mb-5 flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-primary">الرئيسية</Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link to="/browse" className="hover:text-primary">الإعلانات</Link>
        {cat && <>
          <ChevronLeft className="h-3.5 w-3.5" />
          <Link to={`/browse?cat=${cat.slug}`} className="hover:text-primary">{cat.name_ar}</Link>
        </>}
      </nav>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          <div className="card-elevated overflow-hidden">
            <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-muted">
              {ad.images[0] ? (
                <img src={ad.images[activeImg]} alt={ad.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">لا توجد صورة</div>
              )}
              {ad.is_featured && (
                <span className="badge-featured absolute top-4 right-4"><Sparkles className="h-3 w-3" /> مميز</span>
              )}
              {ad.images.length > 1 && (
                <>
                  <button onClick={prev} aria-label="السابق" className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow hover:bg-card">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button onClick={next} aria-label="التالي" className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-card/90 backdrop-blur shadow hover:bg-card">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {ad.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-card">
                {ad.images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`shrink-0 h-16 w-20 rounded-lg overflow-hidden border-2 transition-all ${i === activeImg ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-balance">{ad.title}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {city?.name_ar}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {timeAgoAr(ad.created_at)}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> <span className="num">{ad.views_count}</span> مشاهدة</span>
                  {cat && <span className="inline-flex items-center gap-1"><Tag className="h-4 w-4" /> {cat.name_ar}</span>}
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-primary">
                  <span className="num">{formatPrice(ad.price)}</span>
                </div>
                <div className="text-sm font-bold text-primary/70 mt-0.5">ريال سعودي</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
              <FavoriteButton adId={ad.id} className="!h-9 !w-auto !rounded-md !px-3 !bg-transparent border border-input gap-1.5 text-sm font-medium" />
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('تم نسخ الرابط'); }}>
                <Share2 className="h-4 w-4" /> مشاركة
              </Button>
              {!isOwner && user && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" /> إبلاغ
                </Button>
              )}
            </div>
          </div>

          <div className="card-elevated p-6">
            <h2 className="font-display text-lg font-extrabold mb-3">الوصف</h2>
            <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-pretty">{ad.description}</p>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {seller && (
            <div className="card-elevated p-6 space-y-5">
              <Link to={`/seller/${seller.id}`} className="flex items-center gap-3 group">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-display font-extrabold text-xl">
                  {seller.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold truncate group-hover:text-primary transition-colors">{seller.full_name}</h3>
                    {seller.is_verified && <ShieldCheck className="h-4 w-4 text-success shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Star className="h-3.5 w-3.5 fill-featured text-featured" />
                    <span className="font-bold text-foreground num">{Number(seller.rating_avg).toFixed(1)}</span>
                    <span className="num">({seller.rating_count})</span>
                  </div>
                </div>
              </Link>

              {!isOwner && (
                <div className="space-y-2">
                  <Button className="w-full gap-2 text-base" size="lg" onClick={startConversation} disabled={contacting}>
                    {contacting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                    ابدأ محادثة
                  </Button>
                  {seller.phone ? (
                    showPhone ? (
                      <a href={`tel:${seller.phone}`} dir="ltr"
                        className="block w-full text-center font-bold rounded-xl border border-input h-12 leading-[3rem] hover:bg-accent transition-colors">
                        {seller.phone}
                      </a>
                    ) : (
                      <Button variant="outline" className="w-full gap-2" size="lg"
                        onClick={() => user ? setShowPhone(true) : navigate(`/auth?redirect=/ad/${ad.id}`)}>
                        <Phone className="h-5 w-5" /> {user ? 'إظهار رقم الجوال' : 'سجّل لإظهار الرقم'}
                      </Button>
                    )
                  ) : null}
                </div>
              )}

              <div className="rounded-xl bg-primary-soft border border-primary/20 p-3 text-xs text-foreground/80 leading-relaxed">
                <ShieldCheck className="h-4 w-4 text-primary inline-block ml-1" />
                <strong className="text-primary">نصيحة أمان:</strong> لا ترسل أي مبلغ مقدّم. التقِ البائع في مكان عام وافحص المنتج قبل الدفع.
              </div>
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold mb-6">إعلانات مشابهة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {similar.map((a) => <AdCard key={a.id} ad={a} />)}
          </div>
        </section>
      )}

      <ReportDialog adId={ad.id} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
};

export default AdDetails;
