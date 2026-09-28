-- cart_items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cart" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cart" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cart" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- wishlists table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wishlist" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add own wishlist" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own wishlist" ON public.wishlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);