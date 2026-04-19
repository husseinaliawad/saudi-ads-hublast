import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const schema = z.object({
  title: z.string().trim().min(4, 'العنوان قصير جدًا').max(120, 'العنوان طويل جدًا'),
  description: z.string().trim().min(10, 'الوصف قصير جدًا').max(5000, 'الوصف طويل جدًا'),
  price: z.coerce.number().min(0, 'السعر غير صالح').max(100000000),
  category_id: z.string().min(1, 'اختر القسم'),
  city_id: z.string().min(1, 'اختر المدينة'),
  condition: z.enum(['new', 'like_new', 'good', 'used']).optional(),
});

const PostAd = () => {
  const { categories, cities } = useTaxonomy();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'used' | ''>('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/post-ad');
  }, [user, loading, navigate]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const valid = picked.filter((f) => f.type.startsWith('image/') && f.size < 8 * 1024 * 1024);
    if (valid.length !== picked.length) toast.error('بعض الصور تجاوزت ٨ ميجا أو ليست صور صالحة');
    setFiles((prev) => [...prev, ...valid].slice(0, 8));
    e.target.value = '';
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      title, description, price, category_id: categoryId, city_id: cityId,
      condition: condition || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (files.length === 0) {
      toast.error('أضف صورة واحدة على الأقل');
      return;
    }

    setBusy(true);
    try {
      // Insert ad first (status pending awaits moderation)
      const { data: ad, error: insErr } = await supabase
        .from('ads')
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          price: parsed.data.price,
          category_id: parsed.data.category_id,
          city_id: parsed.data.city_id,
          condition: parsed.data.condition ?? null,
          status: 'published', // for v1: auto-publish; admin can hide
        })
        .select('id')
        .single();
      if (insErr || !ad) throw insErr ?? new Error('failed');

      // Upload each image to user's folder, save URL row
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = (f.name.split('.').pop() ?? 'jpg').toLowerCase();
        const path = `${user.id}/${ad.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('ad-images').upload(path, f, {
          cacheControl: '3600',
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('ad-images').getPublicUrl(path);
        await supabase.from('ad_images').insert({ ad_id: ad.id, image_url: pub.publicUrl, sort_order: i });
      }

      toast.success('تم نشر إعلانك بنجاح!');
      navigate(`/ad/${ad.id}`);
    } catch (err) {
      console.error(err);
      toast.error('تعذّر نشر الإعلان، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-app py-8 sm:py-12 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold">أضف إعلانك</h1>
        <p className="text-muted-foreground mt-1">أكمل البيانات أدناه ليصل إعلانك لآلاف المهتمين.</p>
      </div>

      <form onSubmit={onSubmit} className="card-elevated p-6 sm:p-8 space-y-6">
        {/* Photos */}
        <div className="space-y-3">
          <label className="text-sm font-bold">صور الإعلان <span className="text-muted-foreground">(حتى ٨ صور)</span></label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-foreground/70 text-background opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">رئيسية</span>
                )}
              </div>
            ))}
            {files.length < 8 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary hover:bg-primary-soft/30 transition-colors text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-bold">إضافة صورة</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-bold">عنوان الإعلان</label>
          <input
            id="title" type="text" required maxLength={120}
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تويوتا كامري 2021 — فل أوبشن"
            className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category + City */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold">القسم</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
              className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">اختر القسم</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">المدينة</label>
            <select value={cityId} onChange={(e) => setCityId(e.target.value)} required
              className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
        </div>

        {/* Price + Condition */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold">السعر (ر.س)</label>
            <input type="number" inputMode="numeric" min="0" required
              value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">الحالة</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}
              className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">— غير محدد —</option>
              <option value="new">جديد</option>
              <option value="like_new">شبه جديد</option>
              <option value="good">جيدة</option>
              <option value="used">مستعمل</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold">الوصف</label>
          <textarea
            rows={6} required minLength={10} maxLength={5000}
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="اكتب وصفًا تفصيليًا يساعد المشتري على فهم ما تبيعه."
            className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground"><span className="num">{description.length}</span> / 5000</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>إلغاء</Button>
          <Button type="submit" disabled={busy} className="gap-2 px-8">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            نشر الإعلان
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostAd;
