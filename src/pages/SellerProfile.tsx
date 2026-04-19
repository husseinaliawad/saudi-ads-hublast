import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Star, ShieldCheck, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mapDbAd } from '@/lib/mappers';
import { AdCard } from '@/components/ads/AdCard';
import { useAuth } from '@/context/AuthContext';
import { RatingDialog } from '@/components/ratings/RatingDialog';
import { Button } from '@/components/ui/button';
import { timeAgoAr } from '@/lib/format';
import type { Ad } from '@/types';

interface SellerProfile {
  id: string; full_name: string; bio: string | null; avatar_url: string | null;
  is_verified: boolean; rating_avg: number; rating_count: number; created_at: string;
}
interface RatingRow {
  id: string; rater_id: string; score: number; comment: string | null; created_at: string;
  rater?: { full_name: string } | null;
}

const SellerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateOpen, setRateOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: a }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,bio,avatar_url,is_verified,rating_avg,rating_count,created_at').eq('id', id).maybeSingle(),
      supabase.from('ads').select('*, ad_images(image_url, sort_order)').eq('user_id', id).eq('status', 'published').order('created_at', { ascending: false }),
      supabase.from('ratings').select('id, rater_id, score, comment, created_at').eq('rated_id', id).order('created_at', { ascending: false }).limit(20),
    ]);
    setProfile(p as SellerProfile);
    setAds((a ?? []).map((row) => mapDbAd(row as Parameters<typeof mapDbAd>[0])));
    // enrich ratings with rater name
    const raterIds = [...new Set((r ?? []).map((x) => x.rater_id))];
    const { data: profs } = raterIds.length ? await supabase.from('profiles').select('id,full_name').in('id', raterIds) : { data: [] };
    setRatings((r ?? []).map((row) => ({ ...row, rater: profs?.find((pp) => pp.id === row.rater_id) ?? null })) as RatingRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="container-app py-20 text-center">المستخدم غير موجود</div>;

  const canRate = user && user.id !== profile.id;

  return (
    <div className="container-app py-8 sm:py-10 max-w-5xl space-y-8">
      <div className="card-elevated p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground font-display font-extrabold text-4xl shrink-0">
            {profile.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{profile.full_name}</h1>
              {profile.is_verified && <ShieldCheck className="h-5 w-5 text-success" />}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-featured text-featured" />
                <span className="font-bold text-foreground num">{Number(profile.rating_avg).toFixed(1)}</span>
                <span className="num">({profile.rating_count} تقييم)</span>
              </span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> عضو منذ {timeAgoAr(profile.created_at)}</span>
            </div>
            {profile.bio && <p className="text-foreground/85 leading-relaxed">{profile.bio}</p>}
          </div>
          {canRate && <Button onClick={() => setRateOpen(true)} className="gap-2"><Star className="h-4 w-4" /> قيّم البائع</Button>}
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4">إعلانات البائع <span className="text-muted-foreground text-base">(<span className="num">{ads.length}</span>)</span></h2>
        {ads.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">لا توجد إعلانات منشورة.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4">التقييمات</h2>
        {ratings.length === 0 ? (
          <div className="card-elevated p-8 text-center text-muted-foreground">لا توجد تقييمات بعد.</div>
        ) : (
          <ul className="space-y-3">
            {ratings.map((r) => (
              <li key={r.id} className="card-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/seller/${r.rater_id}`} className="font-bold hover:text-primary">{r.rater?.full_name ?? 'مستخدم'}</Link>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.score ? 'fill-featured text-featured' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgoAr(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-foreground/85 mt-2 whitespace-pre-wrap">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canRate && <RatingDialog open={rateOpen} onOpenChange={setRateOpen} ratedId={profile.id} onSaved={load} />}
    </div>
  );
};

export default SellerProfile;
