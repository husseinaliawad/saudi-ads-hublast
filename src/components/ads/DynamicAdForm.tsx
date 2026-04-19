import { CategoryField } from '@/lib/catalog-api';

interface Props {
  fields: CategoryField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function DynamicAdForm({ fields, values, onChange }: Props) {
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد حقول إضافية لهذه الفئة.</p>;
  }

  const renderField = (field: CategoryField) => {
    const val = values[field.field_key] ?? '';

    if (field.type === 'textarea') {
      return <textarea value={String(val)} onChange={(e) => onChange(field.field_key, e.target.value)} placeholder={field.placeholder ?? ''} className="w-full min-h-24 bg-background border border-input rounded-xl p-3 text-sm" />;
    }

    if (field.type === 'number') {
      return <input type="number" value={String(val)} onChange={(e) => onChange(field.field_key, e.target.value === '' ? '' : Number(e.target.value))} placeholder={field.placeholder ?? ''} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm" />;
    }

    if (field.type === 'select' || field.type === 'radio') {
      return (
        <select value={String(val)} onChange={(e) => onChange(field.field_key, e.target.value)} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm">
          <option value="">اختر</option>
          {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (field.type === 'boolean' || field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input bg-background text-sm">
          <input type="checkbox" checked={Boolean(val)} onChange={(e) => onChange(field.field_key, e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }

    return <input type="text" value={String(val)} onChange={(e) => onChange(field.field_key, e.target.value)} placeholder={field.placeholder ?? ''} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm" />;
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-bold">
            {field.label}
            {field.required ? <span className="text-destructive mr-1">*</span> : null}
          </label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}
