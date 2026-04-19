import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { timeAgoAr } from '@/lib/format';

interface ConvRow {
  id: string;
  ad_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  ad?: { title: string } | null;
  other?: { full_name: string; avatar_url: string | null } | null;
  preview?: string | null;
  unreadCount?: number;
}

const Messages = () => {
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id, ad_id, buyer_id, seller_id, last_message_at')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      const rows = data ?? [];

      const adIds = rows.map((r) => r.ad_id).filter(Boolean) as string[];
      const otherIds = rows.map((r) => (r.buyer_id === user.id ? r.seller_id : r.buyer_id));

      const [{ data: ads }, { data: profs }] = await Promise.all([
        adIds.length ? supabase.from('ads').select('id,title').in('id', adIds) : Promise.resolve({ data: [] }),
        otherIds.length ? supabase.from('profiles').select('id,full_name,avatar_url').in('id', otherIds) : Promise.resolve({ data: [] }),
      ]);

      const [previews, unreadCounts] = await Promise.all([
        Promise.all(rows.map(async (r) => {
          const { data: m } = await supabase.from('messages').select('body').eq('conversation_id', r.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          return m?.body ?? null;
        })),
        Promise.all(rows.map(async (r) => {
          const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
            .eq('conversation_id', r.id).eq('is_read', false).neq('sender_id', user.id);
          return count ?? 0;
        })),
      ]);

      setConvs(rows.map((r, i) => ({
        ...r,
        ad: ads?.find((a) => a.id === r.ad_id) ?? null,
        other: profs?.find((p) => p.id === (r.buyer_id === user.id ? r.seller_id : r.buyer_id)) ?? null,
        preview: previews[i],
        unreadCount: unreadCounts[i],
      })));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container-app py-8 sm:py-10 max-w-3xl">
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-6">المحادثات</h1>
      {convs.length === 0 ? (
        <div className="card-elevated p-12 text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <MessageCircle className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-extrabold">لا توجد محادثات بعد</h3>
          <p className="text-muted-foreground">ابدأ محادثة من صفحة أي إعلان للتواصل مع البائع.</p>
        </div>
      ) : (
        <ul className="card-elevated divide-y divide-border overflow-hidden">
          {convs.map((c) => (
            <li key={c.id}>
              <Link to={`/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-display font-extrabold text-lg shrink-0">
                  {c.other?.full_name.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate">{c.other?.full_name ?? 'مستخدم'}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {Boolean(c.unreadCount) && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center num">
                          {c.unreadCount! > 9 ? '9+' : c.unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgoAr(c.last_message_at)}</span>
                    </div>
                  </div>
                  {c.ad && <p className="text-xs text-primary truncate">{c.ad.title}</p>}
                  {c.preview && <p className="text-sm text-muted-foreground truncate mt-0.5">{c.preview}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Messages;
