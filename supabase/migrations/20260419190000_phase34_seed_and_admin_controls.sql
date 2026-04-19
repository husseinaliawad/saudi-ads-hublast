-- ============================================================
-- Phase 3/4 hardening + Saudi seed data
-- ============================================================

-- Core lookup tables
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cities (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_cities_region ON public.cities(region, is_active);
CREATE INDEX IF NOT EXISTS idx_ad_attributes_ad ON public.ad_attributes(ad_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);

-- Keep lookup timestamps updated
DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cities_updated ON public.cities;
CREATE TRIGGER trg_cities_updated
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK hardening for city/category references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_city_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ads_city_id_fkey'
  ) THEN
    ALTER TABLE public.ads
      ADD CONSTRAINT ads_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES public.cities(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ads_category_id_fkey'
  ) THEN
    ALTER TABLE public.ads
      ADD CONSTRAINT ads_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS categories_admin_manage ON public.categories;
CREATE POLICY categories_admin_manage ON public.categories
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS cities_public_read ON public.cities;
CREATE POLICY cities_public_read ON public.cities
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS cities_admin_manage ON public.cities;
CREATE POLICY cities_admin_manage ON public.cities
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS ad_attrs_public_read ON public.ad_attributes;
CREATE POLICY ad_attrs_public_read ON public.ad_attributes FOR SELECT USING (true);

DROP POLICY IF EXISTS ad_attrs_owner_manage ON public.ad_attributes;
CREATE POLICY ad_attrs_owner_manage ON public.ad_attributes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ads a
      WHERE a.id = ad_id
        AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ads a
      WHERE a.id = ad_id
        AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

DROP POLICY IF EXISTS conv_participants_read ON public.conversation_participants;
CREATE POLICY conv_participants_read ON public.conversation_participants
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS conv_participants_manage ON public.conversation_participants;
CREATE POLICY conv_participants_manage ON public.conversation_participants
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS admin_logs_staff_read ON public.admin_logs;
CREATE POLICY admin_logs_staff_read ON public.admin_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS admin_logs_staff_insert ON public.admin_logs;
CREATE POLICY admin_logs_staff_insert ON public.admin_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Tighten notifications insert policy (self insert only from client).
DROP POLICY IF EXISTS notif_insert_authed ON public.notifications;
DROP POLICY IF EXISTS notif_insert_self ON public.notifications;
CREATE POLICY notif_insert_self ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Keep conversation participants synced.
CREATE OR REPLACE FUNCTION public.sync_conversation_participants()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.buyer_id), (NEW.id, NEW.seller_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conv_participants ON public.conversations;
CREATE TRIGGER trg_sync_conv_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_participants();

-- Moderation helpers + logging
CREATE OR REPLACE FUNCTION public.admin_set_ad_status(
  p_ad_id UUID,
  p_status public.ad_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID; _title TEXT;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.ads
    SET status = p_status, updated_at = now()
  WHERE id = p_ad_id
  RETURNING user_id, title INTO _owner, _title;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'ad_not_found';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, related_entity_type, related_entity_id)
  VALUES (
    _owner,
    'moderation',
    CASE WHEN p_status = 'published' THEN 'تم نشر إعلانك'
         WHEN p_status = 'rejected' THEN 'تم رفض إعلانك'
         WHEN p_status = 'archived' THEN 'تم إخفاء إعلانك'
         ELSE 'تم تحديث حالة إعلانك' END,
    COALESCE(p_note, _title),
    'ad',
    p_ad_id
  );

  INSERT INTO public.admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'set_ad_status', 'ad', p_ad_id::text, jsonb_build_object('status', p_status, 'note', p_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_ad_featured(
  p_ad_id UUID,
  p_is_featured BOOLEAN,
  p_featured_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.ads
    SET is_featured = p_is_featured,
        featured_until = CASE WHEN p_is_featured THEN p_featured_until ELSE NULL END,
        updated_at = now()
  WHERE id = p_ad_id
  RETURNING user_id INTO _owner;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'ad_not_found';
  END IF;

  IF p_is_featured THEN
    INSERT INTO public.notifications (user_id, type, title, body, related_entity_type, related_entity_id)
    VALUES (_owner, 'featured', 'تم تمييز إعلانك', 'إعلانك أصبح ضمن الإعلانات المميزة', 'ad', p_ad_id);
  END IF;

  INSERT INTO public.admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'toggle_featured', 'ad', p_ad_id::text, jsonb_build_object('is_featured', p_is_featured, 'featured_until', p_featured_until));
END;
$$;

-- Restrict ratings to users who had an interaction (conversation around same ad or direct conversation)
CREATE OR REPLACE FUNCTION public.can_rate_user(_rater UUID, _rated UUID, _ad UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE ((c.buyer_id = _rater AND c.seller_id = _rated) OR (c.buyer_id = _rated AND c.seller_id = _rater))
      AND (_ad IS NULL OR c.ad_id = _ad)
  );
$$;

DROP POLICY IF EXISTS ratings_insert_own ON public.ratings;
CREATE POLICY ratings_insert_own ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id
    AND rater_id <> rated_id
    AND public.can_rate_user(rater_id, rated_id, ad_id)
  );

-- Saudi cities seed
INSERT INTO public.cities (id, name_ar, region, is_active) VALUES
  ('riyadh', 'الرياض', 'الوسطى', true),
  ('jeddah', 'جدة', 'الغربية', true),
  ('makkah', 'مكة', 'الغربية', true),
  ('madinah', 'المدينة', 'الغربية', true),
  ('dammam', 'الدمام', 'الشرقية', true),
  ('khobar', 'الخبر', 'الشرقية', true),
  ('dhahran', 'الظهران', 'الشرقية', true),
  ('taif', 'الطائف', 'الغربية', true),
  ('abha', 'أبها', 'الجنوبية', true),
  ('tabuk', 'تبوك', 'الشمالية', true),
  ('buraidah', 'بريدة', 'الوسطى', true),
  ('hail', 'حائل', 'الشمالية', true),
  ('jazan', 'جازان', 'الجنوبية', true),
  ('najran', 'نجران', 'الجنوبية', true),
  ('yanbu', 'ينبع', 'الغربية', true),
  ('jubail', 'الجبيل', 'الشرقية', true),
  ('ahsa', 'الأحساء', 'الشرقية', true),
  ('qatif', 'القطيف', 'الشرقية', true),
  ('khamis', 'خميس مشيط', 'الجنوبية', true)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  region = EXCLUDED.region,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Main categories seed
INSERT INTO public.categories (id, name_ar, slug, parent_id, icon, sort_order, is_active) VALUES
  ('cars', 'سيارات', 'cars', NULL, 'Car', 1, true),
  ('real-estate', 'عقارات', 'real-estate', NULL, 'Building2', 2, true),
  ('jobs', 'وظائف', 'jobs', NULL, 'Briefcase', 3, true),
  ('services', 'خدمات', 'services', NULL, 'Wrench', 4, true),
  ('electronics', 'إلكترونيات', 'electronics', NULL, 'Smartphone', 5, true),
  ('furniture', 'أثاث', 'furniture', NULL, 'Sofa', 6, true),
  ('appliances', 'أجهزة منزلية', 'appliances', NULL, 'WashingMachine', 7, true),
  ('pets', 'حيوانات', 'pets', NULL, 'PawPrint', 8, true),
  ('personal', 'مستلزمات شخصية', 'personal', NULL, 'Shirt', 9, true),
  ('contracting', 'مقاولات', 'contracting', NULL, 'HardHat', 10, true),
  ('transport', 'نقل وشحن', 'transport', NULL, 'Truck', 11, true),
  ('education', 'تعليم وتدريب', 'education', NULL, 'GraduationCap', 12, true)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Sub categories seed
INSERT INTO public.categories (id, name_ar, slug, parent_id, icon, sort_order, is_active) VALUES
  ('cars-sedan', 'سيدان', 'cars-sedan', 'cars', 'Car', 101, true),
  ('cars-suv', 'دفع رباعي', 'cars-suv', 'cars', 'CarFront', 102, true),
  ('cars-parts', 'قطع غيار', 'cars-parts', 'cars', 'Cog', 103, true),
  ('re-villas', 'فلل للبيع', 're-villas', 'real-estate', 'Home', 201, true),
  ('re-apartments-rent', 'شقق للإيجار', 're-apartments-rent', 'real-estate', 'Building', 202, true),
  ('re-land', 'أراضٍ', 're-land', 'real-estate', 'Map', 203, true),
  ('jobs-tech', 'وظائف تقنية', 'jobs-tech', 'jobs', 'Laptop', 301, true),
  ('jobs-sales', 'مبيعات', 'jobs-sales', 'jobs', 'BadgeDollarSign', 302, true),
  ('services-moving', 'نقل عفش', 'services-moving', 'services', 'Package', 401, true),
  ('services-maintenance', 'صيانة منزلية', 'services-maintenance', 'services', 'Hammer', 402, true),
  ('electronics-mobiles', 'جوالات', 'electronics-mobiles', 'electronics', 'Smartphone', 501, true),
  ('electronics-computers', 'أجهزة كمبيوتر', 'electronics-computers', 'electronics', 'Monitor', 502, true),
  ('furniture-living', 'غرف معيشة', 'furniture-living', 'furniture', 'Sofa', 601, true),
  ('furniture-bedroom', 'غرف نوم', 'furniture-bedroom', 'furniture', 'BedSingle', 602, true),
  ('appliances-kitchen', 'أجهزة مطبخ', 'appliances-kitchen', 'appliances', 'ChefHat', 701, true),
  ('transport-local', 'نقل داخل المدن', 'transport-local', 'transport', 'Truck', 1101, true),
  ('education-courses', 'دورات تدريبية', 'education-courses', 'education', 'BookOpen', 1201, true)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Ensure featured plans with readable Arabic names
INSERT INTO public.featured_plans (name, duration_days, price, is_active) VALUES
  ('تمييز 3 أيام', 3, 39, true),
  ('تمييز 7 أيام', 7, 79, true),
  ('تمييز 30 يوم', 30, 249, true)
ON CONFLICT DO NOTHING;

-- Optional seed records driven by existing authenticated users
WITH u AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM auth.users
  LIMIT 6
),
up AS (
  INSERT INTO public.profiles (id, full_name, city_id, bio, is_verified)
  SELECT
    u.id,
    CASE u.rn
      WHEN 1 THEN 'أحمد القحطاني'
      WHEN 2 THEN 'سارة العتيبي'
      WHEN 3 THEN 'محمد الحربي'
      WHEN 4 THEN 'نورة العنزي'
      WHEN 5 THEN 'عبدالله الشهري'
      ELSE 'ريم الدوسري'
    END,
    CASE u.rn
      WHEN 1 THEN 'riyadh'
      WHEN 2 THEN 'jeddah'
      WHEN 3 THEN 'dammam'
      WHEN 4 THEN 'khobar'
      WHEN 5 THEN 'makkah'
      ELSE 'abha'
    END,
    CASE u.rn
      WHEN 1 THEN 'بائع موثوق في قسم السيارات'
      WHEN 2 THEN 'مهتمة بالعقارات والخدمات'
      WHEN 3 THEN 'إلكترونيات ومنتجات تقنية'
      WHEN 4 THEN 'إعلانات متنوعة في الشرقية'
      WHEN 5 THEN 'وسيط عقاري'
      ELSE 'خدمات تدريبية وتعليمية'
    END,
    (u.rn = 1 OR u.rn = 2)
  FROM u
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    city_id = COALESCE(public.profiles.city_id, EXCLUDED.city_id),
    bio = COALESCE(public.profiles.bio, EXCLUDED.bio)
  RETURNING id, full_name
),
seed_ads AS (
  INSERT INTO public.ads (user_id, category_id, city_id, title, description, price, currency, condition, status, is_featured, views_count, favorites_count)
  SELECT
    u.id,
    s.category_id,
    s.city_id,
    s.title,
    s.description,
    s.price,
    'SAR',
    s.condition::public.ad_condition,
    'published',
    s.is_featured,
    s.views_count,
    s.favorites_count
  FROM u
  JOIN (
    VALUES
      (1, 'cars', 'riyadh', 'تويوتا كامري 2021 فل كامل', 'سيارة نظيفة جدًا، صيانة دورية، ممشى 68 ألف كم.', 89000::numeric, 'good', true, 220, 14),
      (2, 'real-estate', 'jeddah', 'شقة للبيع في حي السلامة', 'شقة 4 غرف، قريبة من الخدمات والمدارس.', 640000::numeric, 'good', true, 180, 22),
      (3, 'jobs', 'dammam', 'مطلوب مندوب مبيعات ميداني', 'شركة لوجستية تبحث عن مندوب مبيعات بخبرة سنة.', 6500::numeric, NULL, false, 95, 5),
      (4, 'services', 'khobar', 'خدمة تنظيف فلل ومكاتب', 'فريق محترف مع معدات حديثة وأسعار تنافسية.', 350::numeric, NULL, false, 71, 7),
      (5, 'electronics', 'makkah', 'MacBook Air M2 استخدام خفيف', 'الجهاز بحالة ممتازة مع الشاحن الأصلي.', 3200::numeric, 'like_new', false, 132, 9),
      (6, 'furniture', 'abha', 'غرفة نوم كاملة بحالة ممتازة', 'سرير + دولاب + كوميدينة، خشب طبيعي.', 2400::numeric, 'good', false, 64, 4)
  ) AS s(rn, category_id, city_id, title, description, price, condition, is_featured, views_count, favorites_count)
    ON s.rn = u.rn
  WHERE NOT EXISTS (SELECT 1 FROM public.ads a WHERE a.user_id = u.id AND a.title = s.title)
  RETURNING id, title
)
INSERT INTO public.ad_images (ad_id, image_url, sort_order)
SELECT sa.id,
  CASE sa.title
    WHEN 'تويوتا كامري 2021 فل كامل' THEN 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=1200&q=80'
    WHEN 'شقة للبيع في حي السلامة' THEN 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80'
    WHEN 'مطلوب مندوب مبيعات ميداني' THEN 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80'
    WHEN 'خدمة تنظيف فلل ومكاتب' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'
    WHEN 'MacBook Air M2 استخدام خفيف' THEN 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'
    ELSE 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
  END,
  0
FROM seed_ads sa;

-- Rate limiting note for later phase
COMMENT ON SCHEMA public IS 'Rate limiting is deferred for a dedicated infra phase (edge middleware / WAF based).';