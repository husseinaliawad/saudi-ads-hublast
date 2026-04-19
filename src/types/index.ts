// Domain types for the classifieds platform
export type AdStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'sold' | 'archived';
export type AdCondition = 'new' | 'like_new' | 'good' | 'used';
export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'featured';

export interface City {
  id: string;
  name_ar: string;
  region: string;
}

export interface Category {
  id: string;
  name_ar: string;
  slug: string;
  icon: string; // lucide icon name
  parent_id?: string | null;
  sort_order: number;
}

export interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  city_id: string;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface Ad {
  id: string;
  user_id: string;
  category_id: string;
  city_id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: 'SAR';
  condition?: AdCondition;
  status: AdStatus;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  images: string[];
  attributes?: { key: string; value: string }[];
  created_at: string; // ISO
}
