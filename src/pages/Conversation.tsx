import { useEffect, useRef, useState, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Msg { id: string; sender_id: string; body: string; created_at: string; }
interface ConvHeader { id: string; ad_id: string | null; buyer_id: string; seller_id: string; otherName: string; adTitle: string | null; }

const Conversation = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [header, setHeader] = useState<ConvHeader | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: c } = await supabase.from('conversations')
        .select('id, ad_id, buyer_id, seller_id').eq('id', id).maybeSingle();
      if (!c) { navigate('/messages'); return; }
      const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
      const [{ data: prof }, { data: ad }, { data: msgs }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', otherId).maybeSingle(),
        c.ad_id ? supabase.from('ads').select('title').eq('id', c.ad_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', id).order('created_at', { ascending: true }),
      ]);
      setHeader({ id: c.id, ad_id: c.ad_id, buyer_id: c.buyer_id, seller_id: c.seller_id, otherName: prof?.full_name ?? 'مستخدم', adTitle: ad?.title ?? null });
      setMessages(msgs ?? []);
      // mark as read
      supabase.from('messages').update({ is_read: true }).eq('conversation_id', id).neq('sender_id', user.id).then(() => {});
      setLoading(false);
    })();
  }, [id, user, navigate]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`conv:${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Msg]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user || !id) return;
    setSending(true);
    const text = body.trim();
    setBody('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: id, sender_id: user.id, body: text,
    });
    setSending(false);
    if (error) { setBody(text); return; }
  };

  if (loading) return <div className="container-app py-20 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!header) return null;

  return (
    <div className="container-app py-4 sm:py-6 max-w-3xl">
      <div className="card-elevated overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <Button asChild variant="ghost" size="icon"><Link to="/messages"><ArrowRight className="h-5 w-5" /></Link></Button>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-display font-extrabold">
            {header.otherName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">{header.otherName}</h2>
            {header.ad_id && header.adTitle && (
              <Link to={`/ad/${header.ad_id}`} className="text-xs text-primary truncate hover:underline block">{header.adTitle}</Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">ابدأ المحادثة بإرسال أول رسالة 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm',
                  mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md'
                )}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <div className={cn('text-[10px] mt-1', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')} dir="ltr">
                    {new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-border bg-card flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالة..." maxLength={2000}
            className="flex-1 h-11 bg-background border border-input rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={sending || !body.trim()} className="px-5 gap-2">
            <Send className="h-4 w-4" /> إرسال
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Conversation;
