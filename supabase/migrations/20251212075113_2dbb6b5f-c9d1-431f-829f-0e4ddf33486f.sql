-- Add created_at timestamp to title_emotional_signatures_staging to track processing time
ALTER TABLE public.title_emotional_signatures_staging 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create index for efficient lookups by title_id and created_at
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_staging_title_created 
ON public.title_emotional_signatures_staging (title_id, created_at DESC);