ALTER TABLE public.hero_banners
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS background_color text;