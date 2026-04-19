import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { AdCard } from '@/components/ads/AdCard';
import { AdCardSkeleton } from '@/components/ads/AdCardSkeleton';
import { FiltersPanel, defaultFilters, type FilterState } from '@/components/filters/FiltersPanel';
import { Button } from '@/components/ui/button';
import { fetchPublishedAds } from '@/lib/queries';
import type { Ad } from '@/types';

function readFilters(sp: URLSearchParams): FilterState {
  return {
    q: sp.get('q') ?? '',
    cat: sp.get('cat') ?? '',
    city: sp.get('city') ?? '',
    minPrice: sp.get('min') ?? '',
    maxPrice: sp.get('max') ?? '',
    featuredOnly: sp.get('featured') === '1',
    sort: (sp.get('sort') as FilterState['sort']) ?? 'newest',
  };
}
function writeFilters(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.cat) sp.set('cat', f.cat);
  if (f.city) sp.set('city', f.city);
  if (f.minPrice) sp.set('min', f.minPrice);
  if (f.maxPrice) sp.set('max', f.maxPrice);
  if (f.featuredOnly) sp.set('featured', '1');
  if (f.sort && f.sort !== 'newest') sp.set('sort', f.sort);
  return sp;
}

const Browse = () => {
  const { categories } = useTaxonomy();
  const [sp, setSp] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => readFilters(sp));
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Ad[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setSp(writeFilters(filters), { replace: true }); }, [filters, setSp]);

  // debounce + fetch
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      const cat = filters.cat ? categories.find((c) => c.slug === filters.cat) : null;
      try {
        const list = await fetchPublishedAds({
          q: filters.q || undefined,
          categoryId: cat?.id,
          cityId: filters.city || undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          featuredOnly: filters.featuredOnly,
          sort: filters.sort,
        });
        setResults(list);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [filters, categories]);

  const activeCat = filters.cat ? categories.find((c) => c.slug === filters.cat) : null;
  const heading = useMemo(() => activeCat ? activeCat.name_ar : 'كل الإعلانات', [activeCat]);

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{heading}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading
            ? 'جاري التحميل...'
            : <>تم العثور على <span className="font-bold text-foreground num">{results.length}</span> إعلان</>}
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="hidden lg:block">
          <div className="sticky top-24"><FiltersPanel value={filters} onChange={setFilters} /></div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" className="lg:hidden gap-2" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> الفلاتر
            </Button>
            <div className="flex items-center gap-2 mr-auto">
              <label className="text-sm text-muted-foreground hidden sm:inline">ترتيب:</label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })}
                className="bg-card border border-input rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">الأحدث</option>
                <option value="featured">المميزة أولًا</option>
                <option value="price_asc">السعر: من الأقل</option>
                <option value="price_desc">السعر: من الأعلى</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="card-elevated p-12 text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <SlidersHorizontal className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-display text-xl font-extrabold">لا توجد نتائج مطابقة</h3>
                <p className="text-muted-foreground mt-1">جرّب توسيع نطاق البحث أو إعادة ضبط الفلاتر.</p>
              </div>
              <Button onClick={() => setFilters(defaultFilters)} variant="outline">إعادة ضبط الفلاتر</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
              {results.map((ad) => <AdCard key={ad.id} ad={ad} />)}
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative ml-auto h-full w-full max-w-sm bg-background overflow-y-auto animate-fade-in">
            <div className="sticky top-0 flex items-center justify-between p-4 bg-background border-b border-border">
              <h3 className="font-display font-extrabold text-lg">الفلاتر</h3>
              <button onClick={() => setDrawerOpen(false)} aria-label="إغلاق" className="p-2 rounded-lg hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <FiltersPanel value={filters} onChange={setFilters} />
              <Button className="w-full mt-4" onClick={() => setDrawerOpen(false)}>عرض النتائج</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Browse;
