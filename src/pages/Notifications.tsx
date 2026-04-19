import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { timeAgoAr } from '@/lib/format';
import { cn } from '@/lib/utils';

interface NotifRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

const linkFor = (n: NotifRow) => {
  if (n.related_entity_type === 'conversation' && n.related_entity_id) return `/messages/${n.related_entity_id}`;
  if (n.related_entity_type === 'ad' && n.related_entity_id) return `/ad/${n.related_entity_id}`;
  return null;
};

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setItems((data ?? []) as NotifRow[]);
      setLoading(false);
    };

    fetchItems();

    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchItems)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.is_read) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container-app py-8 sm:py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">الإشعارات</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card-elevated p-12 text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-extrabold">لا توجد إشعارات</h3>
          <p className="text-muted-foreground">سنخبرك هنا بالرسائل والتحديثات الجديدة.</p>
        </div>
      ) : (
        <ul className="card-elevated divide-y divide-border overflow-hidden">
          {items.map((n) => {
            const href = linkFor(n);
            const inner = (
              <div className={cn('flex gap-3 p-4', !n.is_read && 'bg-primary-soft/40')}>
                <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', n.is_read ? 'bg-transparent' : 'bg-primary')} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold">{n.title}</h3>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgoAr(n.created_at)}</p>
                </div>
              </div>
            );

            return (
              <li key={n.id} onClick={() => markOneRead(n.id)}>
                {href ? (
                  <Link to={href} className="block hover:bg-accent/30 transition-colors">{inner}</Link>
                ) : (
                  <button className="block w-full text-right hover:bg-accent/30 transition-colors">{inner}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
