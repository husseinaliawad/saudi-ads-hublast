import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, Edit, Loader2, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTaxonomy } from '@/hooks/use-taxonomy';

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  city_id: string | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  city_id: z.string().optional().or(z.literal('')),
});

const Profile = () => {
  const { cities } = useTaxonomy();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ adsCount: 0, totalViews: 0, favoritesCount: 0 });

  // form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [cityId, setCityId] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: ads }, { data: favs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('ads').select('id,views_count').eq('user_id', user.id),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (p) {
        setProfile(p as ProfileRow);
        setFullName(p.full_name);
        setPhone(p.phone ?? '');
        setBio(p.bio ?? '');
        setCityId(p.city_id ?? '');
      }
      setStats({
        adsCount: ads?.length ?? 0,
        totalViews: ads?.reduce((s, a) => s + (a.views_count ?? 0), 0) ?? 0,
        favoritesCount: favs ? (favs as unknown as { count?: number }).count ?? 0 : 0,
      });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ full_name: fullName, phone, bio, city_id: cityId });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      bio: parsed.data.bio || null,
      city_id: parsed.data.city_id || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) toast.error('تعذّر الحفظ');
    else {
      toast.success('تم تحديث ملفك');
      setEditing(false);
      if (profile) setProfile({ ...profile, full_name: parsed.data.full_name, phone: parsed.data.phone || null, bio: parsed.data.bio || null, city_id: parsed.data.city_id || null });
    }
  };

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return null;

  return (
    <div className="container-app py-8 sm:py-12 max-w-4xl">
      <div className="card-elevated p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground font-display font-extrabold text-4xl shrink-0">
            {profile.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{profile.full_name}</h1>
              {profile.is_verified && <ShieldCheck className="h-5 w-5 text-success" />}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-featured text-featured" />
              <span className="font-bold num">{profile.rating_avg}</span>
              <span className="text-muted-foreground num">({profile.rating_count} تقييم)</span>
            </div>
            {profile.bio && <p className="text-foreground/85 leading-relaxed">{profile.bio}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            {!editing && <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}><Edit className="h-4 w-4" /> تعديل</Button>}
            <Button variant="ghost" className="gap-2 text-destructive" onClick={signOut}><LogOut className="h-4 w-4" /> خروج</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'إعلاناتي', v: stats.adsCount },
            { l: 'مشاهدات', v: stats.totalViews },
            { l: 'مفضلتي', v: stats.favoritesCount },
          ].map((s) => (
            <div key={s.l} className="bg-secondary rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-primary num">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="font-display font-extrabold text-lg">تعديل بياناتي</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">الاسم</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100}
                  className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">الجوال</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" maxLength={20}
                  className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring text-right" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-bold">المدينة</label>
                <select value={cityId} onChange={(e) => setCityId(e.target.value)}
                  className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— غير محدد —</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-bold">نبذة عنك</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500}
                  className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>إلغاء</Button>
              <Button className="gap-2" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 grid grid-cols-2 gap-2">
          <Button asChild variant="outline"><Link to="/my-ads">إعلاناتي</Link></Button>
          <Button asChild variant="outline"><Link to="/favorites">المفضلة</Link></Button>
          <Button asChild variant="outline"><Link to="/messages">المحادثات</Link></Button>
          <Button asChild variant="outline"><Link to="/notifications">الإشعارات</Link></Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
