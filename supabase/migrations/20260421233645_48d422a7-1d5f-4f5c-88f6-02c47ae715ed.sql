ALTER TABLE public.hero_banners
  ADD COLUMN IF NOT EXISTS image_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_button boolean NOT NULL DEFAULT true;