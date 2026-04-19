// Shared mappers between Supabase ad rows and our UI Ad type
import type { Ad } from '@/types';

interface DbAd {
  id: string;
  user_id: string;
  category_id: string;
  city_id: string;
  title: string;
  description: string;
  price: number | string;
  currency: string;
  condition: 'new' | 'like_new' | 'good' | 'used' | null;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'sold' | 'archived';
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  created_at: string;
  ad_images?: { image_url: string; sort_order: number }[];
}

export function mapDbAd(row: DbAd, fallbackImage?: string): Ad {
  const images = (row.ad_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.image_url);
  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    city_id: row.city_id,
    title: row.title,
    slug: row.id,
    description: row.description,
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    currency: 'SAR',
    condition: row.condition ?? undefined,
    status: row.status,
    is_featured: row.is_featured,
    views_count: row.views_count,
    favorites_count: row.favorites_count,
    images: images.length > 0 ? images : (fallbackImage ? [fallbackImage] : []),
    created_at: row.created_at,
  };
}
