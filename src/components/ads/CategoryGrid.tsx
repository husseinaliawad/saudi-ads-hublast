import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { cn } from '@/lib/utils';

export function CategoryGrid({ className }: { className?: string }) {
  const { categories } = useTaxonomy();
  const topCategories = categories.filter((cat) => !cat.parent_id);

  return (
    <div className={cn('grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4', className)}>
      {topCategories.map((cat) => {
        const Icon = ((Icons as unknown as Record<string, Icons.LucideIcon>)[cat.icon] ?? Icons.Tag);
        return (
          <Link
            key={cat.id}
            to={`/browse?cat=${cat.slug}`}
            className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary-soft/40 hover:-translate-y-0.5 transition-all"
          >
            <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-secondary text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground text-center leading-tight">
              {cat.name_ar}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
