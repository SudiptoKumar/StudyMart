-- Reset inflated cart quantities caused by previous duplication bug
DELETE FROM public.cart_items WHERE quantity > 10;