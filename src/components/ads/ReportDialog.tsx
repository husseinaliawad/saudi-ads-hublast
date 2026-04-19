import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const REASONS = ['محتوى مخالف', 'إعلان مكرر', 'سعر مضلّل', 'احتيال محتمل', 'فئة خاطئة', 'أخرى'];

export function ReportDialog({ adId, open, onOpenChange }: { adId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('reports').insert({
      ad_id: adId, reporter_id: user.id, reason, details: details || null,
    });
    setBusy(false);
    if (error) toast.error('تعذّر إرسال البلاغ');
    else { toast.success('تم إرسال البلاغ، شكرًا لك'); onOpenChange(false); setDetails(''); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>الإبلاغ عن الإعلان</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="text-sm font-bold">السبب</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full h-11 bg-background border border-input rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="text-sm font-bold">تفاصيل (اختياري)</label>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500}
            className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={busy}>إرسال</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
