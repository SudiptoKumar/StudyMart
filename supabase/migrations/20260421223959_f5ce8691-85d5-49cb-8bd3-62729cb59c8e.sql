CREATE POLICY "Buyers read purchased product files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files'
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.slug = oi.product_slug
          AND p.file_url = storage.objects.name
      )
  )
);

CREATE POLICY "Public read previews"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product-files'
  AND name LIKE 'previews/%'
);