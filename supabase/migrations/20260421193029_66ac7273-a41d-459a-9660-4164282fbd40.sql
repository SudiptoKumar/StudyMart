ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_type text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_preview_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_preview_type_check
  CHECK (preview_type IS NULL OR preview_type IN ('pdf', 'image', 'video'));