import { Link } from 'react-router-dom';
import { Heart, MapPin, Sparkles } from 'lucide-react';
import type { Ad } from '@/types';
import { cityById } from '@/data/cities';
import { categoryById } from '@/data/categories';
import { formatPrice, timeAgoAr } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  ad: Ad;
  className?: string;
}

export function AdCard({ ad, className }: Props) {
  const city = cityById(ad.city_id);
  const cat = categoryById(ad.category_id);

  return (
    <Link
      to={`/ad/${ad.id}`}
      className={cn(
        'group block card-elevated overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={ad.images[0]}
          alt={ad.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {ad.is_featured && (
          <span className="badge-featured absolute top-3 right-3">
            <Sparkles className="h-3 w-3" />
            مميز
          </span>
        )}
        <button
          type="button"
          aria-label="إضافة للمفضلة"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 backdrop-blur text-foreground shadow-sm hover:bg-card hover:text-destructive transition-colors"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-extrabold text-primary">
            <span className="num">{formatPrice(ad.price)}</span>
            <span className="mr-1 text-sm font-bold text-primary/70">ر.س</span>
          </span>
          {cat && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {cat.name_ar}
            </span>
          )}
        </div>

        <h3 className="font-display font-bold text-base leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {ad.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {city?.name_ar}
          </span>
          <span>{timeAgoAr(ad.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
