-- Create storage buckets for product assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'product-files',
  'product-files',
  false,
  209715200
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- product-images: public read, admin write
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- product-files: admin-only read/write (buyers get signed URLs)
CREATE POLICY "Admins read product files"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload product files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update product files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete product files"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));