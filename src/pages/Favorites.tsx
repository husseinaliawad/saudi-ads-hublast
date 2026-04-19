import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { AdCard } from '@/components/ads/AdCard';
import type { Ad } from '@/types';
import { mapDbAd } from '@/lib/mappers';
import { Button } from '@/components/ui/button';

const Favorites = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('ad:ads(*, ad_images(image_url, sort_order))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) toast.error('تعذّر جلب المفضلة');
      const list = (data ?? []).map((r: { ad: unknown }) => mapDbAd(r.ad as Parameters<typeof mapDbAd>[0])).filter((a) => a.id);
      setAds(list);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="container-app py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Heart className="h-7 w-7 text-destructive" /> المفضلة
        </h1>
        <p className="text-muted-foreground mt-1">الإعلانات التي حفظتها للرجوع إليها لاحقًا</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : ads.length === 0 ? (
        <div className="card-elevated p-12 text-center space-y-3">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-display text-xl font-extrabold">لا توجد إعلانات في المفضلة</h3>
          <p className="text-muted-foreground">ابدأ بحفظ ما يعجبك من إعلانات.</p>
          <Button asChild><Link to="/browse">تصفّح الإعلانات</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {ads.map((a) => <AdCard key={a.id} ad={a} />)}
        </div>
      )}
    </div>
  );
};

export default Favorites;
