import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export function FavoriteButton({ adId, className, size = 'md' }: { adId: string; className?: string; size?: 'sm' | 'md' }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: isFav } = useQuery({
    queryKey: ['favorite', user?.id, adId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('favorites').select('id').eq('user_id', user.id).eq('ad_id', adId).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const active = optimistic ?? isFav ?? false;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('not-authed');
      if (active) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('ad_id', adId);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, ad_id: adId });
      }
    },
    onMutate: () => setOptimistic(!active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorite', user?.id, adId] }),
    onError: () => { setOptimistic(null); toast.error('حدث خطأ'); },
  });

  const handle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) {
      toast('سجّل دخولك لإضافة الإعلانات للمفضلة');
      navigate('/auth');
      return;
    }
    toggle.mutate();
  };

  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <button
      type="button"
      aria-label={active ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      onClick={handle}
      className={cn(
        'grid place-items-center rounded-full bg-card/90 backdrop-blur shadow-sm transition-colors',
        dim,
        active ? 'text-destructive' : 'text-foreground hover:text-destructive',
        className,
      )}
    >
      <Heart className={cn(size === 'sm' ? 'h-4 w-4' : 'h-4 w-4', active && 'fill-current')} />
    </button>
  );
}
