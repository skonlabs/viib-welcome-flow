-- Add updated_at column to viib_intent_classified_titles_staging (if not exists)
ALTER TABLE public.viib_intent_classified_titles_staging 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add index for efficient staleness queries on viib_intent_classified_titles
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_updated_at 
ON public.viib_intent_classified_titles(updated_at);

-- Create trigger to auto-update updated_at on viib_intent_classified_titles
CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_viib_intent_classified_titles_updated_at ON public.viib_intent_classified_titles;

CREATE TRIGGER trigger_update_viib_intent_classified_titles_updated_at
BEFORE UPDATE ON public.viib_intent_classified_titles
FOR EACH ROW
EXECUTE FUNCTION public.update_viib_intent_classified_titles_updated_at();