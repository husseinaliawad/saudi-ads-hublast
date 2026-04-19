import { api } from '@/lib/api';

export interface HierCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: number | boolean;
  icon?: string | null;
  image?: string | null;
}

export interface CategoryField {
  id: string;
  field_key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'boolean' | 'date';
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
  validation?: Record<string, unknown>;
  sort_order: number;
  is_filterable: boolean;
  is_searchable: boolean;
}

export interface CatalogAd {
  id: string;
  title: string;
  description?: string;
  price: number;
  city_id?: string;
  city_name?: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  status: string;
  is_featured: boolean;
  created_at: string;
  field_values: Record<string, unknown>;
}

export interface AdsSearchResponse {
  items: CatalogAd[];
  total: number;
  page: number;
  page_size: number;
  selected_category: HierCategory | null;
  breadcrumb: HierCategory[];
  children: HierCategory[];
  filters: CategoryField[];
}

export async function getCategoryRoots() {
  const res = await api<{ roots: HierCategory[] }>('/api/categories/tree');
  return res.roots;
}

export async function getCategoryChildren(categoryId: string) {
  const res = await api<{ items: HierCategory[] }>(`/api/categories/${categoryId}/children`);
  return res.items;
}

export async function getCategoryBreadcrumb(categoryId: string) {
  const res = await api<{ items: HierCategory[] }>(`/api/categories/${categoryId}/breadcrumb`);
  return res.items;
}

export async function getCategoryFields(categoryId: string) {
  const res = await api<{ items: CategoryField[] }>(`/api/categories/${categoryId}/fields`);
  return res.items;
}

export async function resolveCategoryBySlug(slug: string) {
  const res = await api<{ item: HierCategory }>(`/api/categories/slug/${slug}`);
  return res.item;
}

export async function searchAds(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  return api<AdsSearchResponse>(`/api/ads?${sp.toString()}`);
}

export async function createAd(payload: {
  title: string;
  description: string;
  price: number;
  city_id: string;
  category_id: string;
  status?: string;
  field_values: Record<string, unknown>;
}) {
  return api<{ id: string }>('/api/ads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
