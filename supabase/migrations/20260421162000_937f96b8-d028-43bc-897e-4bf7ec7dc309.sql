-- Fix sales_count increment: trigger on order_items (which is inserted AFTER order),
-- instead of on orders (where items don't exist yet at insert time).

-- Drop old trigger on orders if present
DROP TRIGGER IF EXISTS increment_sales_on_order_trigger ON public.orders;
DROP TRIGGER IF EXISTS trg_increment_sales_on_order ON public.orders;

-- New function: increment sales_count when an order_item is inserted,
-- provided the parent order is in a paid/completed state.
CREATE OR REPLACE FUNCTION public.increment_sales_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_status TEXT;
BEGIN
  SELECT status INTO order_status FROM public.orders WHERE id = NEW.order_id;
  IF order_status IN ('completed', 'paid') THEN
    UPDATE public.products
       SET sales_count = sales_count + NEW.quantity
     WHERE slug = NEW.product_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_sales_on_order_item ON public.order_items;
CREATE TRIGGER trg_increment_sales_on_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.increment_sales_on_order_item();

-- Also keep the orders trigger for the case where status transitions to paid later
DROP TRIGGER IF EXISTS trg_increment_sales_on_order_status ON public.orders;
CREATE TRIGGER trg_increment_sales_on_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.increment_sales_on_order();

-- Backfill sales_count from existing paid/completed orders to correct historical data
UPDATE public.products p
   SET sales_count = COALESCE(sub.total, 0)
  FROM (
    SELECT oi.product_slug, SUM(oi.quantity)::int AS total
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE o.status IN ('completed', 'paid')
     GROUP BY oi.product_slug
  ) sub
 WHERE p.slug = sub.product_slug;