import { CatalogAd } from '@/lib/catalog-api';
import { formatPrice, timeAgoAr } from '@/lib/format';

interface Props {
  items: CatalogAd[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AdsListing({ items, total, page, pageSize, onPageChange }: Props) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">عدد النتائج: <span className="font-bold num">{total}</span></p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((ad) => (
            <a key={ad.id} href={`/ad/${ad.id}`} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold line-clamp-2">{ad.title}</h3>
                {ad.is_featured ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">مميز</span> : null}
              </div>
              <p className="mt-2 text-primary font-extrabold"><span className="num">{formatPrice(ad.price)}</span> ر.س</p>
              <p className="mt-1 text-xs text-muted-foreground">{ad.category_name ?? '-'} · {ad.city_name ?? '-'} · {timeAgoAr(ad.created_at)}</p>
            </a>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" className="h-9 px-3 rounded-lg border" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>السابق</button>
          <span className="text-sm">{page} / {pages}</span>
          <button type="button" className="h-9 px-3 rounded-lg border" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>التالي</button>
        </div>
      )}
    </div>
  );
}
