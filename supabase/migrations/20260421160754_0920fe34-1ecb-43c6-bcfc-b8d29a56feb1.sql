-- =========================================
-- RATINGS
-- =========================================
CREATE TABLE public.product_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_product_ratings_product ON public.product_ratings(product_id);

ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

-- Helper: did this user purchase this product?
CREATE OR REPLACE FUNCTION public.has_purchased_product(_user_id UUID, _product_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.slug = oi.product_slug
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.user_id = _user_id
      AND p.id = _product_id
      AND o.status IN ('completed', 'paid')
  );
$$;

CREATE POLICY "Anyone views ratings"
  ON public.product_ratings FOR SELECT
  USING (true);

CREATE POLICY "Buyers can rate"
  ON public.product_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_purchased_product(auth.uid(), product_id)
  );

CREATE POLICY "Users update own rating"
  ON public.product_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own rating"
  ON public.product_ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_product_ratings_updated_at
  BEFORE UPDATE ON public.product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep products.rating in sync with average of product_ratings
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid UUID;
  avg_rating NUMERIC;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  SELECT ROUND(AVG(rating)::numeric, 2) INTO avg_rating
  FROM public.product_ratings WHERE product_id = pid;
  UPDATE public.products SET rating = COALESCE(avg_rating, 0) WHERE id = pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER refresh_product_rating_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

-- =========================================
-- COMMENTS
-- =========================================
CREATE TABLE public.product_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_comments_product ON public.product_comments(product_id, created_at DESC);

ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views comments"
  ON public.product_comments FOR SELECT
  USING (true);

CREATE POLICY "Signed-in users comment"
  ON public.product_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own comment"
  ON public.product_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users or admins delete comment"
  ON public.product_comments FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_comments_updated_at
  BEFORE UPDATE ON public.product_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SALES COUNTER — increment on completed/paid orders
-- =========================================
CREATE OR REPLACE FUNCTION public.increment_sales_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'paid')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.products p
       SET sales_count = sales_count + oi.quantity
      FROM public.order_items oi
     WHERE oi.order_id = NEW.id
       AND p.slug = oi.product_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_sales_on_order_trg
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_sales_on_order();

-- =========================================
-- REALTIME
-- =========================================
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.product_ratings REPLICA IDENTITY FULL;
ALTER TABLE public.product_comments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_comments;
