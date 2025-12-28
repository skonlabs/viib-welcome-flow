
-- Update users with null country to default to US (for testing)
-- In production, the onboarding flow now auto-detects country from IP
UPDATE users 
SET country = 'US'
WHERE country IS NULL;
