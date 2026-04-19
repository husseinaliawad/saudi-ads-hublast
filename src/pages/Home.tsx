import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSearch } from '@/components/ads/HeroSearch';
import { CategoryGrid } from '@/components/ads/CategoryGrid';
import { AdCard } from '@/components/ads/AdCard';
import { AdCardSkeleton } from '@/components/ads/AdCardSkeleton';
import { fetchPublishedAds } from '@/lib/queries';
import type { Ad } from '@/types';
import heroImg from '@/assets/hero-riyadh.jpg';

const Home = () => {
  const [featured, setFeatured] = useState<Ad[]>([]);
  const [latest, setLatest] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [f, l] = await Promise.all([
          fetchPublishedAds({ featuredOnly: true, sort: 'newest', limit: 4 }),
          fetchPublishedAds({ sort: 'newest', limit: 8 }),
        ]);
        setFeatured(f);
        setLatest(l);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-95" aria-hidden />
        <img src={heroImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/0 to-transparent" aria-hidden />

        <div className="container-app relative pt-14 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
          <div className="max-w-3xl space-y-6 text-primary-foreground">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/15 backdrop-blur text-sm font-medium border border-card/20">
              <Sparkles className="h-4 w-4" /> منصة الإعلانات الأولى في المملكة
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-balance">
              كل ما تبحث عنه،<br />في مكان واحد.
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-2xl text-pretty">
              سيارات، عقارات، وظائف، خدمات وأكثر — من مدنك المفضّلة في المملكة. تواصَل مباشرة مع البائعين بأمان وثقة.
            </p>
          </div>
          <div className="mt-10"><HeroSearch /></div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-primary-foreground/95">
            {[
              { n: '+250 ألف', l: 'إعلان نشط' },
              { n: '+19', l: 'مدينة سعودية' },
              { n: '+50 ألف', l: 'بائع موثوق' },
              { n: '24/7', l: 'دعم ومتابعة' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-card/10 backdrop-blur border border-card/15 p-4">
                <div className="font-display text-2xl font-extrabold"><span className="num">{s.n}</span></div>
                <div className="text-sm text-primary-foreground/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-14 sm:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold">تصفّح حسب القسم</h2>
            <p className="text-muted-foreground mt-1">ابدأ من القسم الأقرب لاهتمامك</p>
          </div>
          <Button asChild variant="ghost" className="gap-1 hidden sm:inline-flex">
            <Link to="/browse">عرض الكل <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
        <CategoryGrid />
      </section>

      {(loading || featured.length > 0) && (
        <section className="bg-gradient-sand py-14 sm:py-20">
          <div className="container-app">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="badge-featured mb-2"><Sparkles className="h-3 w-3" /> مميز</span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold">إعلانات مختارة لك</h2>
                <p className="text-muted-foreground mt-1">أفضل العروض من بائعين موثوقين</p>
              </div>
              <Button asChild variant="ghost" className="gap-1 hidden sm:inline-flex">
                <Link to="/browse?featured=1">المزيد <ArrowLeft className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <AdCardSkeleton key={i} />)
                : featured.map((ad) => <AdCard key={ad.id} ad={ad} />)}
            </div>
          </div>
        </section>
      )}

      <section className="container-app py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 sm:p-12 text-primary-foreground shadow-elegant">
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-featured/30 blur-3xl" aria-hidden />
          <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-6">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold mb-2">لديك شيء تريد بيعه؟</h3>
              <p className="text-primary-foreground/85 text-base sm:text-lg max-w-xl">
                أضِف إعلانك مجانًا في أقل من دقيقة، وابدأ باستقبال العروض من جميع مناطق المملكة.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="gap-2 text-base font-bold shadow-lg">
              <Link to="/post-ad"><Plus className="h-5 w-5" /> أضف إعلانك الآن</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-app pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> أحدث الإعلانات
            </h2>
            <p className="text-muted-foreground mt-1">منشورة حديثًا في مدنك</p>
          </div>
          <Button asChild variant="ghost" className="gap-1 hidden sm:inline-flex">
            <Link to="/browse">تصفّح الكل <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)
            : latest.length === 0
              ? <p className="col-span-full text-center text-muted-foreground py-12">لا توجد إعلانات حتى الآن. كن أول من ينشر!</p>
              : latest.map((ad) => <AdCard key={ad.id} ad={ad} />)}
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="container-app py-12 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, t: 'بيع وشراء آمن', d: 'حسابات موثّقة وأدوات حماية متطورة' },
            { icon: Sparkles, t: 'تجربة مميّزة', d: 'واجهة عربية أصلية وتصميم سريع وسهل' },
            { icon: TrendingUp, t: 'وصول أوسع', d: 'إعلانك يصل لآلاف المهتمين يوميًا' },
          ].map((f) => (
            <div key={f.t} className="space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h4 className="font-display font-bold text-lg">{f.t}</h4>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
