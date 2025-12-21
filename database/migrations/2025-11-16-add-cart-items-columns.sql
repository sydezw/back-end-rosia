-- Add color, size, and price columns to cart_items
-- Run these in Supabase SQL Editor or psql

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS size text;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS price numeric;