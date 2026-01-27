-- Migration: Add product sizing system to fs_products
-- Supports clothing (XS, S, M, L, XL, XXL) and shoes (39-46)

-- Add product_type column with constraint
ALTER TABLE public.fs_products
ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'clothing';

ALTER TABLE public.fs_products
ADD CONSTRAINT fs_products_product_type_check
CHECK (product_type IN ('clothing', 'shoes'));

-- Add sizes array (list of available sizes for this product)
ALTER TABLE public.fs_products
ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}';

-- Add size_stock jsonb (stock per size, e.g. {"M": 5, "L": 3})
ALTER TABLE public.fs_products
ADD COLUMN IF NOT EXISTS size_stock jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add size column to order items to track which size was purchased
ALTER TABLE public.fs_order_items
ADD COLUMN IF NOT EXISTS size text NULL;

-- Create index for product_type filtering
CREATE INDEX IF NOT EXISTS idx_fs_products_product_type ON public.fs_products(product_type);

COMMENT ON COLUMN public.fs_products.product_type IS 'Product type: clothing or shoes';
COMMENT ON COLUMN public.fs_products.sizes IS 'Array of available sizes for this product';
COMMENT ON COLUMN public.fs_products.size_stock IS 'Stock per size as JSON object, e.g. {"M": 5, "L": 3}';
COMMENT ON COLUMN public.fs_order_items.size IS 'Selected size for this order item';
