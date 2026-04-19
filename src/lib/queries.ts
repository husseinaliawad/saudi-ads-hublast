// Live Supabase queries for browsing
import { supabase } from '@/integrations/supabase/client';
import { mapDbAd } from '@/lib/mappers';
import { ads as localAds, adById } from '@/data/ads';
import type { Ad, Category, City } from '@/types';

const SELECT = '*, ad_images(image_url, sort_order)';

function runLocalAdFallback(opts: {
  q?: string; categoryId?: string; cityId?: string;
  minPrice?: number; maxPrice?: number; featuredOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
  limit?: number;
} = {}): Ad[] {
  let rows = [...localAds].filter((a) => a.status === 'published');
  if (opts.q) {
    const needle = opts.q.toLowerCase().trim();
    rows = rows.filter((a) =>
      a.title.toLowerCase().includes(needle) ||
      a.description.toLowerCase().includes(needle)
    );
  }
  if (opts.categoryId) rows = rows.filter((a) => a.category_id === opts.categoryId);
  if (opts.cityId) rows = rows.filter((a) => a.city_id === opts.cityId);
  if (typeof opts.minPrice === 'number') rows = rows.filter((a) => a.price >= opts.minPrice!);
  if (typeof opts.maxPrice === 'number') rows = rows.filter((a) => a.price <= opts.maxPrice!);
  if (opts.featuredOnly) rows = rows.filter((a) => a.is_featured);

  switch (opts.sort) {
    case 'price_asc':
      rows.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      rows.sort((a, b) => b.price - a.price);
      break;
    case 'featured':
      rows.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || +new Date(b.created_at) - +new Date(a.created_at));
      break;
    default:
      rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }

  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

export async function fetchPublishedAds(opts: {
  q?: string; categoryId?: string; cityId?: string;
  minPrice?: number; maxPrice?: number; featuredOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
  limit?: number;
} = {}): Promise<Ad[]> {
  let q = supabase.from('ads').select(SELECT).eq('status', 'published');
  if (opts.q) q = q.or(`title.ilike.%${opts.q}%,description.ilike.%${opts.q}%`);
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.cityId) q = q.eq('city_id', opts.cityId);
  if (typeof opts.minPrice === 'number') q = q.gte('price', opts.minPrice);
  if (typeof opts.maxPrice === 'number') q = q.lte('price', opts.maxPrice);
  if (opts.featuredOnly) q = q.eq('is_featured', true);
  switch (opts.sort) {
    case 'price_asc':  q = q.order('price', { ascending: true }); break;
    case 'price_desc': q = q.order('price', { ascending: false }); break;
    case 'featured':   q = q.order('is_featured', { ascending: false }).order('created_at', { ascending: false }); break;
    default:           q = q.order('created_at', { ascending: false });
  }
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    return runLocalAdFallback(opts);
  }
  if (!data || data.length === 0) {
    return runLocalAdFallback(opts);
  }
  return data.map((r) => mapDbAd(r as Parameters<typeof mapDbAd>[0]));
}

export async function fetchAdById(id: string): Promise<Ad | null> {
  const { data, error } = await supabase.from('ads').select(SELECT).eq('id', id).maybeSingle();
  if (error) return adById(id) ?? null;
  return data ? mapDbAd(data as Parameters<typeof mapDbAd>[0]) : (adById(id) ?? null);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name_ar,slug,icon,parent_id,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function fetchCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('id,name_ar,region')
    .eq('is_active', true)
    .order('name_ar', { ascending: true });
  if (error) return [];
  return (data ?? []) as City[];
}
