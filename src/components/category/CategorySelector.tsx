import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryChildren, getCategoryRoots, type HierCategory } from '@/lib/catalog-api';

interface Props {
  value?: string;
  onChange: (category: HierCategory | null) => void;
}

export function CategorySelector({ value, onChange }: Props) {
  const [columns, setColumns] = useState<HierCategory[][]>([]);
  const [selectedPath, setSelectedPath] = useState<HierCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const roots = await getCategoryRoots();
      setColumns([roots]);
      setLoading(false);
    })();
  }, []);

  const selectedLeaf = useMemo(() => {
    if (selectedPath.length === 0) return null;
    const last = selectedPath[selectedPath.length - 1];
    const lastColumnChildren = columns[selectedPath.length] ?? [];
    if (lastColumnChildren.length > 0) return null;
    return last;
  }, [selectedPath, columns]);

  useEffect(() => {
    if (value && selectedPath[selectedPath.length - 1]?.id === value) return;
    if (!value) onChange(selectedLeaf);
  }, [value, selectedLeaf, selectedPath, onChange]);

  const pick = async (level: number, cat: HierCategory) => {
    const nextPath = [...selectedPath.slice(0, level), cat];
    setSelectedPath(nextPath);
    const children = await getCategoryChildren(cat.id);
    const nextColumns = [...columns.slice(0, level + 1), children];
    setColumns(nextColumns);
    onChange(children.length === 0 ? cat : null);
  };

  if (loading) {
    return <div className="h-32 rounded-xl border border-border bg-card animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {selectedPath.map((c, idx) => (
          <span key={c.id} className="inline-flex items-center gap-2">
            {idx > 0 && <ChevronLeft className="h-3.5 w-3.5" />}
            <span>{c.name}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
        {columns.map((col, level) => (
          <div key={level} className="rounded-xl border border-border bg-card p-2 min-h-[220px]">
            {col.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">لا يوجد مستويات إضافية</p>
            ) : (
              <div className="space-y-1">
                {col.map((cat) => {
                  const active = selectedPath[level]?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => pick(level, cat)}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent'}`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedLeaf && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            تم اختيار الفئة النهائية: {selectedLeaf.name}
          </div>
          <Button type="button" size="sm" onClick={() => onChange(selectedLeaf)}>متابعة</Button>
        </div>
      )}
    </div>
  );
}
