-- BUNDLES
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views published bundles"
  ON public.bundles FOR SELECT
  USING (status = 'published' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage bundles"
  ON public.bundles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BUNDLE ITEMS
CREATE TABLE public.bundle_items (
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bundle_id, product_slug)
);

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views items of published bundles"
  ON public.bundle_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_items.bundle_id
        AND (b.status = 'published' OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins manage bundle items"
  ON public.bundle_items FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bundle_items_bundle ON public.bundle_items(bundle_id, position);

-- PRICE ALERTS
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all alerts"
  ON public.price_alerts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_price_alerts_product ON public.price_alerts(product_id);

-- NOTIFICATION QUEUE
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notification_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notification_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all notifications"
  ON public.notification_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notification_queue_user_unread
  ON public.notification_queue(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- TRIGGER: queue price-drop notifications
CREATE OR REPLACE FUNCTION public.queue_price_drop_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price < OLD.price THEN
    INSERT INTO public.notification_queue (user_id, type, payload)
    SELECT
      pa.user_id,
      'price_drop',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_slug', NEW.slug,
        'product_title', NEW.title,
        'product_image', NEW.image_url,
        'old_price', OLD.price,
        'new_price', NEW.price
      )
    FROM public.price_alerts pa
    WHERE pa.product_id = NEW.id
      AND (pa.target_price IS NULL OR NEW.price <= pa.target_price);

    UPDATE public.price_alerts
       SET notified_at = now()
     WHERE product_id = NEW.id
       AND (target_price IS NULL OR NEW.price <= target_price);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_price_drop_trigger
  AFTER UPDATE OF price ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_price_drop_notifications();