-- Add missing languages that are causing foreign key errors
INSERT INTO languages (language_code, language_name, flag_emoji) VALUES
('pt', 'Portuguese', '🇵🇹'),
('zh', 'Chinese', '🇨🇳'),
('ja', 'Japanese', '🇯🇵'),
('ko', 'Korean', '🇰🇷'),
('ar', 'Arabic', '🇸🇦'),
('ru', 'Russian', '🇷🇺')
ON CONFLICT (language_code) DO NOTHING;

-- Reset the full refresh job to idle state
UPDATE jobs 
SET status = 'idle', 
    error_message = NULL,
    configuration = jsonb_set(
      COALESCE(configuration, '{}'::jsonb),
      '{titles_per_batch}',
      '100'
    )
WHERE job_type = 'full_refresh';