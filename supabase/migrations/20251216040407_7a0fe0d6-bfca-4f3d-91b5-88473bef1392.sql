-- Add created_at column to title_emotional_signatures for staleness tracking
ALTER TABLE public.title_emotional_signatures 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

-- Add index for efficient staleness queries
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_created_at 
ON public.title_emotional_signatures(created_at);