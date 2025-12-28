-- Add vibe_weight column to viib_weight_config
ALTER TABLE public.viib_weight_config 
ADD COLUMN IF NOT EXISTS vibe_weight real NOT NULL DEFAULT 0.0;

-- Update the existing active config to redistribute weights to include vibe
-- Current: emotional=0.35, social=0.20, historical=0.25, context=0.10, novelty=0.10 = 1.0
-- New: emotional=0.30, social=0.15, historical=0.20, context=0.10, novelty=0.10, vibe=0.15 = 1.0
UPDATE public.viib_weight_config 
SET 
  emotional_weight = 0.30,
  social_weight = 0.15,
  historical_weight = 0.20,
  vibe_weight = 0.15,
  notes = 'Updated to include vibe_weight component'
WHERE is_active = true;