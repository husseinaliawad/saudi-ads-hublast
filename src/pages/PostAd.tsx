import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { CategorySelector } from '@/components/category/CategorySelector';
import { DynamicAdForm } from '@/components/ads/DynamicAdForm';
import { createAd, getCategoryFields, type CategoryField, type HierCategory } from '@/lib/catalog-api';
import { fetchCities } from '@/lib/queries';

const baseSchema = z.object({
  title: z.string().trim().min(4, 'العنوان قصير جدًا').max(120),
  description: z.string().trim().min(10, 'الوصف قصير جدًا').max(5000),
  price: z.coerce.number().min(0, 'السعر غير صالح'),
  city_id: z.string().min(1, 'اختر المدينة'),
  category_id: z.string().min(1, 'اختر الفئة النهائية'),
});

const PostAd = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name_ar: string }>>([]);

  const [selectedCategory, setSelectedCategory] = useState<HierCategory | null>(null);
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/post-ad');
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const list = await fetchCities();
      setCities(list);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryFields([]);
      setFieldValues({});
      return;
    }
    (async () => {
      const fields = await getCategoryFields(selectedCategory.id);
      setCategoryFields(fields);
      setFieldValues({});
    })();
  }, [selectedCategory]);

  const requiredDynamicMissing = useMemo(() => {
    return categoryFields.some((f) => f.required && (fieldValues[f.field_key] === undefined || fieldValues[f.field_key] === '' || fieldValues[f.field_key] === null));
  }, [categoryFields, fieldValues]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCategory) return;

    const parsed = baseSchema.safeParse({
      title,
      description,
      price,
      city_id: cityId,
      category_id: selectedCategory.id,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (requiredDynamicMissing) {
      toast.error('أكمل الحقول الإلزامية للفئة المختارة');
      return;
    }

    setBusy(true);
    try {
      const created = await createAd({
        title: parsed.data.title,
        description: parsed.data.description,
        price: parsed.data.price,
        city_id: parsed.data.city_id,
        category_id: parsed.data.category_id,
        status: 'published',
        field_values: fieldValues,
      });
      toast.success('تم نشر الإعلان بنجاح');
      navigate(`/ad/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر نشر الإعلان');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-app py-8 sm:py-12 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold">أضف إعلانك</h1>
        <p className="text-muted-foreground mt-1">اختر الفئة خطوة بخطوة، ثم أكمل نموذج الفئة الديناميكي.</p>
      </div>

      <form onSubmit={onSubmit} className="card-elevated p-6 sm:p-8 space-y-6">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-extrabold">1) اختيار الفئة</h2>
          <CategorySelector onChange={setSelectedCategory} />
        </section>

        {selectedCategory && (
          <>
            <section className="space-y-3 border-t border-border pt-6">
              <h2 className="font-display text-xl font-extrabold">2) بيانات الإعلان الأساسية</h2>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">العنوان</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">الوصف</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full bg-background border border-input rounded-xl p-3 text-sm" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">السعر</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">المدينة</label>
                  <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm">
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-6">
              <h2 className="font-display text-xl font-extrabold">3) خصائص الفئة ({selectedCategory.name})</h2>
              <DynamicAdForm fields={categoryFields} values={fieldValues} onChange={(k, v) => setFieldValues((prev) => ({ ...prev, [k]: v }))} />
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>إلغاء</Button>
              <Button type="submit" disabled={busy} className="gap-2 px-8">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                نشر الإعلان
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default PostAd;
