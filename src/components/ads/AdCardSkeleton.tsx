import { cn } from '@/lib/utils';

export function AdCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card-elevated overflow-hidden', className)}>
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="flex justify-between pt-1">
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
