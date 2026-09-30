
-- 1) Wipe existing demo orders & items
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- 2) Add hidden_at for soft-clearing user purchase history
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_user_hidden ON public.orders (user_id, hidden_at);
CREATE INDEX IF NOT EXISTS idx_order_items_user_hidden ON public.order_items (user_id, hidden_at);

-- Allow users to soft-delete (hide) their own orders/items via UPDATE (already allowed by existing policy)
-- No new policy needed: "Update own orders" already permits user UPDATE.
-- For order_items, add an UPDATE policy so users can hide their items.
CREATE POLICY "Users hide own order items"
ON public.order_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Add stable product_code for admin tracking (consistent across purchases)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_code text;

-- Backfill product_code: PRD-<8 char upper hex from id>
UPDATE public.products
SET product_code = 'PRD-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))
WHERE product_code IS NULL;

-- Ensure new products always get a code
ALTER TABLE public.products
  ALTER COLUMN product_code SET DEFAULT ('PRD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8)));

CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_key ON public.products (product_code);

-- 4) Mirror product_code on order_items so admin sees it even if product is deleted
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_code text;
