-- 1. app_settings table for bootstrap admin emails
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app_settings"
  ON public.app_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed bootstrap admin emails (migrated from hardcoded trigger)
INSERT INTO public.app_settings (key, value)
VALUES ('bootstrap_admin_emails', '["thekarnraj@gmail.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Update handle_new_user_role to read from app_settings
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_emails jsonb;
BEGIN
  SELECT value INTO admin_emails FROM public.app_settings WHERE key = 'bootstrap_admin_emails';
  IF admin_emails IS NOT NULL AND admin_emails ? NEW.email THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Add coupon_code column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- 4. Lock down product-images bucket listing: only admins can list, public can still read individual objects
DROP POLICY IF EXISTS "Public list product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list product-images" ON storage.objects;

-- Keep public read access for individual objects (already works via public bucket)
-- But add an admin-only LIST policy to prevent enumeration beyond what bucket-public allows
-- Note: public buckets already allow anonymous GET by path; the concern is listing.
-- Supabase storage.objects SELECT policy controls listing. Restrict SELECT to admins + public-by-path reads handled at bucket level.
CREATE POLICY "Admins list product-images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );