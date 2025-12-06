-- Add protected flag to restaurants table
-- Protected restaurants won't be deleted during re-enrichment

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS protected BOOLEAN DEFAULT false;
