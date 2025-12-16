-- Add updated_at column to title_emotional_signatures (primary)
ALTER TABLE public.title_emotional_signatures 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add updated_at column to title_emotional_signatures_staging
ALTER TABLE public.title_emotional_signatures_staging 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add index for efficient staleness queries on primary table
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_updated_at 
ON public.title_emotional_signatures(updated_at);

-- Create trigger to auto-update updated_at on title_emotional_signatures
CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_title_emotional_signatures_updated_at
BEFORE UPDATE ON public.title_emotional_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_title_emotional_signatures_updated_at();