import { CategoryField, HierCategory } from '@/lib/catalog-api';

interface Props {
  currentCategory: HierCategory | null;
  children: HierCategory[];
  filters: CategoryField[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const baseKeys = ['category', 'q', 'city', 'price_min', 'price_max', 'sort', 'page', 'featured'];

export function CategoryFilters({ currentCategory, children, filters, values, onChange }: Props) {
  const set = (k: string, v: string) => onChange({ ...values, [k]: v, page: '1' });

  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-display text-lg font-extrabold">الفلاتر</h3>

      {children.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-bold">الفئات الفرعية</label>
          <div className="space-y-1">
            {children.map((c) => (
              <button key={c.id} type="button" onClick={() => set('category', c.slug)} className="w-full text-right px-3 py-2 rounded-lg hover:bg-accent text-sm">
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input value={values.price_min ?? ''} onChange={(e) => set('price_min', e.target.value)} placeholder="السعر من" className="h-10 border border-input rounded-lg px-3 text-sm" />
        <input value={values.price_max ?? ''} onChange={(e) => set('price_max', e.target.value)} placeholder="السعر إلى" className="h-10 border border-input rounded-lg px-3 text-sm" />
      </div>

      {filters.map((f) => {
        const key = f.field_key;
        const val = values[key] ?? '';
        if (f.type === 'select' || f.type === 'radio') {
          return (
            <div key={f.id} className="space-y-1.5">
              <label className="text-sm font-bold">{f.label}</label>
              <select value={val} onChange={(e) => set(key, e.target.value)} className="w-full h-10 border border-input rounded-lg px-3 text-sm">
                <option value="">الكل</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        }
        if (f.type === 'boolean' || f.type === 'checkbox') {
          return (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={val === '1'} onChange={(e) => set(key, e.target.checked ? '1' : '')} />
              {f.label}
            </label>
          );
        }
        return (
          <div key={f.id} className="space-y-1.5">
            <label className="text-sm font-bold">{f.label}</label>
            <input value={val} onChange={(e) => set(key, e.target.value)} placeholder={f.placeholder ?? ''} className="w-full h-10 border border-input rounded-lg px-3 text-sm" />
          </div>
        );
      })}

      <button
        type="button"
        className="w-full h-10 rounded-lg border border-input text-sm"
        onClick={() => {
          const next: Record<string, string> = {};
          Object.keys(values).forEach((k) => {
            if (baseKeys.includes(k)) next[k] = values[k] ?? '';
          });
          if (currentCategory?.slug) next.category = currentCategory.slug;
          onChange(next);
        }}
      >
        إعادة ضبط
      </button>
    </aside>
  );
}
