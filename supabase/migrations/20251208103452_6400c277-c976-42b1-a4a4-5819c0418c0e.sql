-- Update streaming service names to match frontend display names
UPDATE streaming_services SET service_name = 'Apple TV+' WHERE service_name = 'Apple TV';
UPDATE streaming_services SET service_name = 'Disney+' WHERE service_name = 'DisneyPlus';

-- Add HBO Max if not exists
INSERT INTO streaming_services (service_name, is_active)
SELECT 'HBO Max', true
WHERE NOT EXISTS (SELECT 1 FROM streaming_services WHERE service_name ILIKE '%hbo%' OR service_name ILIKE '%max%');

-- Drop unused providers and title_providers tables
DROP TABLE IF EXISTS title_providers CASCADE;
DROP TABLE IF EXISTS providers CASCADE;