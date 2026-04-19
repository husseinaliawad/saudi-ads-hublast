import { ads as localAds, adById } from '@/data/ads';
import { categories as localCategories } from '@/data/categories';
import { cities as localCities } from '@/data/cities';
import type { Ad, Category, City } from '@/types';
import { api } from '@/lib/api';

function toLegacyAd(row: any): Ad {
  const fallback = adById(String(row.id));
  return {
    id: String(row.id),
    user_id: String(row.user_id ?? 'u1'),
    category_id: String(row.category_id ?? fallback?.category_id ?? ''),
    city_id: String(row.city_id ?? fallback?.city_id ?? ''),
    title: String(row.title ?? ''),
    slug: String(row.category_slug ?? row.id),
    description: String(row.description ?? ''),
    price: Number(row.price ?? 0),
    currency: 'SAR',
    condition: fallback?.condition,
    status: (row.status ?? 'published') as Ad['status'],
    is_featured: Boolean(row.is_featured),
    views_count: fallback?.views_count ?? 0,
    favorites_count: fallback?.favorites_count ?? 0,
    images: fallback?.images ?? ['/favicon.ico'],
    attributes: fallback?.attributes ?? [],
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchPublishedAds(opts: {
  q?: string;
  categoryId?: string;
  cityId?: string;
  minPrice?: number;
  maxPrice?: number;
  featuredOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
  limit?: number;
} = {}): Promise<Ad[]> {
  try {
    const query: Record<string, string | number> = {
      sort: opts.sort ?? 'newest',
      page_size: opts.limit ?? 48,
      page: 1,
    };
    if (opts.q) query.q = opts.q;
    if (opts.cityId) query.city = opts.cityId;
    if (typeof opts.minPrice === 'number') query.price_min = opts.minPrice;
    if (typeof opts.maxPrice === 'number') query.price_max = opts.maxPrice;
    if (opts.featuredOnly) query.featured = 1;
    if (opts.categoryId) {
      const cat = localCategories.find((c) => c.id === opts.categoryId);
      if (cat) query.category = cat.slug;
    }
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => sp.set(k, String(v)));
    const res = await api<{ items: any[] }>(`/api/ads?${sp.toString()}`);
    return (res.items ?? []).map(toLegacyAd);
  } catch {
    let rows = [...localAds].filter((a) => a.status === 'published');
    if (opts.q) {
      const needle = opts.q.toLowerCase().trim();
      rows = rows.filter((a) => a.title.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle));
    }
    if (opts.categoryId) rows = rows.filter((a) => a.category_id === opts.categoryId);
    if (opts.cityId) rows = rows.filter((a) => a.city_id === opts.cityId);
    if (typeof opts.minPrice === 'number') rows = rows.filter((a) => a.price >= opts.minPrice!);
    if (typeof opts.maxPrice === 'number') rows = rows.filter((a) => a.price <= opts.maxPrice!);
    if (opts.featuredOnly) rows = rows.filter((a) => a.is_featured);
    return opts.limit ? rows.slice(0, opts.limit) : rows;
  }
}

export async function fetchAdById(id: string): Promise<Ad | null> {
  const list = await fetchPublishedAds({ limit: 200 });
  return list.find((a) => a.id === id) ?? adById(id) ?? null;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const tree = await api<{ roots: any[] }>('/api/categories/tree');
    const flatten = (nodes: any[]): any[] => nodes;
    const roots = flatten(tree.roots ?? []);
    return roots.map((c, idx) => ({
      id: String(c.id),
      name_ar: String(c.name),
      slug: String(c.slug),
      icon: String(c.icon ?? 'Tag'),
      parent_id: c.parent_id ?? null,
      sort_order: Number(c.sort_order ?? idx + 1),
    }));
  } catch {
    return localCategories;
  }
}

export async function fetchCities(): Promise<City[]> {
  try {
    const res = await api<{ items?: any[] }>('/api/cities');
    const rows = (res as any).items ?? [];
    if (!Array.isArray(rows)) return localCities;
    return rows.map((c: any) => ({ id: String(c.id), name_ar: String(c.name_ar ?? c.name), region: String(c.region ?? '') }));
  } catch {
    return localCities;
  }
}
