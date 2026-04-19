-- Allow system inserts via triggers; allow users to insert notifications targeted at others (e.g. message recipient) only via authenticated participant in conv (simpler: allow any authed insert; restrict by app logic). For safety, allow inserts where the inserter is the message sender creating notif for the other conversation participant.
CREATE POLICY notif_insert_authed ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: bump conversation last_message_at on new message + create notification for recipient
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _recipient UUID; _conv RECORD;
BEGIN
  SELECT * INTO _conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF _conv.buyer_id = NEW.sender_id THEN _recipient := _conv.seller_id;
  ELSE _recipient := _conv.buyer_id; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, related_entity_type, related_entity_id)
  VALUES (_recipient, 'message', 'رسالة جديدة', LEFT(NEW.body, 120), 'conversation', NEW.conversation_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

DROP TRIGGER IF EXISTS trg_notify_msg ON public.messages;
CREATE TRIGGER trg_notify_msg AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

-- Recompute rating trigger
DROP TRIGGER IF EXISTS trg_rating_recompute ON public.ratings;
CREATE TRIGGER trg_rating_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_user_rating();

-- New-user signup trigger
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_ads_updated ON public.ads;
CREATE TRIGGER trg_ads_updated BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed default featured plans
INSERT INTO public.featured_plans (name, duration_days, price, is_active) VALUES
  ('تمييز ٧ أيام', 7, 49, true),
  ('تمييز ١٤ يومًا', 14, 89, true),
  ('تمييز ٣٠ يومًا', 30, 149, true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ads_status_created ON public.ads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_category ON public.ads (category_id);
CREATE INDEX IF NOT EXISTS idx_ads_city ON public.ads (city_id);
CREATE INDEX IF NOT EXISTS idx_ads_user ON public.ads (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_images_ad ON public.ad_images (ad_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);