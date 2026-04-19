import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoryFilters } from '@/components/filters/CategoryFilters';
import { AdsListing } from '@/components/ads/AdsListing';
import { searchAds, type AdsSearchResponse } from '@/lib/catalog-api';
import { fetchCities } from '@/lib/queries';
import type { City } from '@/types';

function paramsToObject(sp: URLSearchParams) {
  const obj: Record<string, string> = {};
  sp.forEach((v, k) => {
    obj[k] = v;
  });
  if (!obj.category && obj.cat) obj.category = obj.cat;
  return obj;
}

function objectToParams(obj: Record<string, string>) {
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (!v) return;
    sp.set(k, v);
  });
  return sp;
}

const Browse = () => {
  const [sp, setSp] = useSearchParams();
  const [params, setParams] = useState<Record<string, string>>(() => paramsToObject(sp));
  const [data, setData] = useState<AdsSearchResponse | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setSp(objectToParams(params), { replace: true });
  }, [params, setSp]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAds({
          ...params,
          page: params.page ?? '1',
          page_size: '18',
        });
        setData(res);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [params]);

  const heading = useMemo(() => {
    if (!data?.selected_category) return 'All ads';
    return data.selected_category.name;
  }, [data]);

  if (!data && loading) {
    return <div className="container-app py-10">Loading...</div>;
  }

  return (
    <div className="container-app py-8 sm:py-10 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{heading}</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Loading results...' : 'Results based on category and dynamic filters'}
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <CategoryFilters
          currentCategory={data?.selected_category ?? null}
          children={data?.children ?? []}
          cities={cities.map((c) => ({ id: c.id, name_ar: c.name_ar }))}
          filters={data?.filters ?? []}
          values={params}
          onChange={setParams}
        />

        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-between">
            <div className="text-sm text-muted-foreground">
              Breadcrumb: {(data?.breadcrumb ?? []).map((c) => c.name).join(' > ') || 'root'}
            </div>
            <select
              value={params.sort ?? 'newest'}
              onChange={(e) => setParams((prev) => ({ ...prev, sort: e.target.value, page: '1' }))}
              className="h-10 border border-input rounded-lg px-3 text-sm bg-card"
            >
              <option value="newest">Newest</option>
              <option value="featured">Featured first</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
            </select>
          </div>

          {data && (
            <AdsListing
              items={data.items}
              total={data.total}
              page={data.page}
              pageSize={data.page_size}
              onPageChange={(p) => setParams((prev) => ({ ...prev, page: String(p) }))}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;
