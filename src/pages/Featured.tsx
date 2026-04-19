import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Plan { id: string; name: string; duration_days: number; price: number; }
interface MyAd { id: string; title: string; is_featured: boolean; }

const Featured = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ads, setAds] = useState<MyAd[]>([]);
  const [adId, setAdId] = useState<string>(sp.get('ad') ?? '');
  const [planId, setPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('featured_plans').select('id,name,duration_days,price').eq('is_active', true).order('duration_days'),
        supabase.from('ads').select('id,title,is_featured').eq('user_id', user.id).eq('status', 'published').order('created_at', { ascending: false }),
      ]);
      setPlans(p ?? []);
      setAds(a ?? []);
      setLoading(false);
    })();
  }, [user]);

  const submit = async () => {
    if (!user || !adId || !planId) { toast.error('اختر الإعلان والباقة'); return; }
    setBusy(true);
    const { error } = await supabase.from('featured_ad_orders').insert({
      user_id: user.id, ad_id: adId, plan_id: planId, status: 'pending',
    });
    setBusy(false);
    if (error) toast.error('تعذّر إرسال الطلب');
    else {
      toast.success('تم إرسال طلب التمييز — سنتواصل معك قريبًا');
      navigate('/my-ads');
    }
  };

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container-app py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-10">
        <span className="badge-featured mb-3"><Sparkles className="h-3 w-3" /> تمييز الإعلان</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold">اجعل إعلانك يصل أكثر</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          الإعلانات المميزة تظهر في أعلى نتائج البحث وفي الصفحة الرئيسية، وتحصل على مشاهدات أعلى بكثير.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {plans.map((p) => {
          const active = planId === p.id;
          return (
            <button key={p.id} onClick={() => setPlanId(p.id)}
              className={cn('card-elevated p-6 text-right transition-all relative',
                active ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/40')}>
              {active && <div className="absolute top-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></div>}
              <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
              <div className="font-display text-3xl font-extrabold text-primary mt-3">
                <span className="num">{p.price}</span> <span className="text-base font-bold text-primary/70">ر.س</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1"><span className="num">{p.duration_days}</span> يومًا</p>
            </button>
          );
        })}
      </div>

      <div className="card-elevated p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold">اختر الإعلان</label>
          <select value={adId} onChange={(e) => setAdId(e.target.value)}
            className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">— اختر إعلانًا —</option>
            {ads.map((a) => <option key={a.id} value={a.id}>{a.title}{a.is_featured ? ' (مميز حاليًا)' : ''}</option>)}
          </select>
          {ads.length === 0 && <p className="text-xs text-muted-foreground">ليس لديك إعلانات منشورة. أضف إعلانًا أولًا.</p>}
        </div>
        <div className="rounded-xl bg-primary-soft border border-primary/20 p-3 text-xs text-foreground/80">
          ملاحظة: ميزة الدفع الإلكتروني قيد التحضير. سيصلك تأكيد الطلب وسنتواصل معك لإكمال التفعيل.
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy || !adId || !planId} className="gap-2 px-8">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد طلب التمييز
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Featured;
