import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RatingDialog({ open, onOpenChange, ratedId, onSaved }:
  { open: boolean; onOpenChange: (v: boolean) => void; ratedId: string; onSaved?: () => void }) {
  const { user } = useAuth();
  const [score, setScore] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    // upsert: delete previous then insert
    await supabase.from('ratings').delete().eq('rater_id', user.id).eq('rated_id', ratedId);
    const { error } = await supabase.from('ratings').insert({
      rater_id: user.id, rated_id: ratedId, score, comment: comment || null,
    });
    setBusy(false);
    if (error) toast.error('تعذّر حفظ التقييم');
    else { toast.success('تم حفظ تقييمك'); onOpenChange(false); setComment(''); setScore(5); onSaved?.(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تقييم البائع</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-3">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              const active = value <= (hover || score);
              return (
                <button key={i} type="button"
                  onMouseEnter={() => setHover(value)} onMouseLeave={() => setHover(0)}
                  onClick={() => setScore(value)} className="p-1">
                  <Star className={cn('h-9 w-9 transition-transform hover:scale-110', active ? 'fill-featured text-featured' : 'text-muted')} />
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">تعليق (اختياري)</label>
            <textarea rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="شارك تجربتك مع هذا البائع"
              className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={busy}>إرسال التقييم</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
