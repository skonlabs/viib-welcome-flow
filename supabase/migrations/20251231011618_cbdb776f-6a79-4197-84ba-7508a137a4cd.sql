-- First drop the existing check constraint
ALTER TABLE public.user_vibe_preferences 
DROP CONSTRAINT IF EXISTS user_vibe_preferences_vibe_type_check;

-- Update existing data to match canonical_key values
UPDATE public.user_vibe_preferences 
SET vibe_type = 'curious_thought_provoking' 
WHERE vibe_type = 'curious_thoughtprovoking';

UPDATE public.user_vibe_preferences 
SET vibe_type = 'light_feel_good' 
WHERE vibe_type = 'light_feelgood';

-- Add updated check constraint matching canonical_key values from vibes table
ALTER TABLE public.user_vibe_preferences 
ADD CONSTRAINT user_vibe_preferences_vibe_type_check 
CHECK (vibe_type = ANY (ARRAY[
  'calm_reflective',
  'light_feel_good', 
  'bold_energetic',
  'curious_thought_provoking',
  'dark_intense',
  'adventure_discovery',
  'bold_exciting'
]));