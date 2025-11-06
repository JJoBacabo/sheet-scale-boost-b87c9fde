-- Add last_sold_at column to products table to track when product was last sold
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS last_sold_at timestamp with time zone;

-- Add index for better performance when filtering by last_sold_at
CREATE INDEX IF NOT EXISTS idx_products_last_sold_at 
ON products(last_sold_at DESC);