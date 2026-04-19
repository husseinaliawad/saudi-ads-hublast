import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterState {
  q: string;
  cat: string;        // category slug, '' = all
  city: string;       // city id, '' = all
  minPrice: string;
  maxPrice: string;
  featuredOnly: boolean;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'featured';
}

export const defaultFilters: FilterState = {
  q: '', cat: '', city: '', minPrice: '', maxPrice: '', featuredOnly: false, sort: 'newest',
};

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  className?: string;
  compact?: boolean;
  onClose?: () => void;
}

export function FiltersPanel({ value, onChange, className, compact, onClose }: Props) {
  const { categories, cities } = useTaxonomy();
  const topCategories = categories.filter((cat) => !cat.parent_id);
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    const next = { ...local, [k]: v };
    setLocal(next);
    onChange(next);
  };

  return (
    <aside className={cn('bg-card rounded-2xl border border-border/60 p-5 space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-extrabold flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          الفلاتر
        </h3>
        {compact && onClose && (
          <button onClick={onClose} aria-label="إغلاق" className="p-1 rounded-lg hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground">القسم</label>
        <select
          value={local.cat}
          onChange={(e) => set('cat', e.target.value)}
          className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">كل الأقسام</option>
          {topCategories.map((c) => <option key={c.id} value={c.slug}>{c.name_ar}</option>)}
        </select>
      </div>

      {/* City */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground">المدينة</label>
        <select
          value={local.city}
          onChange={(e) => set('city', e.target.value)}
          className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">كل المدن</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground">السعر (ر.س)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" inputMode="numeric" min="0"
            placeholder="من"
            value={local.minPrice}
            onChange={(e) => set('minPrice', e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="number" inputMode="numeric" min="0"
            placeholder="إلى"
            value={local.maxPrice}
            onChange={(e) => set('maxPrice', e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Featured */}
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-featured-soft/60 border border-featured/30">
        <input
          type="checkbox"
          checked={local.featuredOnly}
          onChange={(e) => set('featuredOnly', e.target.checked)}
          className="h-4 w-4 accent-[hsl(var(--featured))]"
        />
        <span className="text-sm font-bold text-foreground">الإعلانات المميزة فقط</span>
      </label>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => { setLocal(defaultFilters); onChange(defaultFilters); }}
      >
        إعادة ضبط الفلاتر
      </Button>
    </aside>
  );
}
