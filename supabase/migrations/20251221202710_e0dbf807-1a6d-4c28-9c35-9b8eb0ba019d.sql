-- Add certification column to titles table for movie/TV ratings (G, PG, PG-13, R, etc.)
ALTER TABLE public.titles 
ADD COLUMN IF NOT EXISTS certification TEXT;