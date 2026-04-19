/** Format a SAR price in Arabic-friendly numerals (kept LTR for legibility). */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Relative Arabic time, e.g. "قبل ٣ أيام". */
export function timeAgoAr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `قبل ${d} يوم`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `قبل ${mo} شهر`;
  return `قبل ${Math.floor(mo / 12)} سنة`;
}
