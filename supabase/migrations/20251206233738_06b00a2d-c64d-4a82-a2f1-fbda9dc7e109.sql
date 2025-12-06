-- Add missing official trailer channels
INSERT INTO official_trailer_channels (channel_name, language_code, category, is_active, priority) VALUES
-- Major Studio Aliases
('Warner Bros.', 'en', 'studio', true, 1),
('WB Pictures', 'en', 'studio', true, 1),
('Columbia Pictures', 'en', 'studio', true, 1),
('Sony Pictures', 'en', 'studio', true, 1),
('Paramount', 'en', 'studio', true, 1),
('20th Century Fox', 'en', 'studio', true, 1),
('Disney', 'en', 'studio', true, 1),
('Marvel Studios', 'en', 'studio', true, 1),
('DC', 'en', 'studio', true, 1),
('Lionsgate', 'en', 'studio', true, 1),
('Metro-Goldwyn-Mayer', 'en', 'studio', true, 1),

-- Indie/Specialty Distributors
('Searchlight Pictures', 'en', 'indie', true, 2),
('Fox Searchlight', 'en', 'indie', true, 2),
('Sony Pictures Classics', 'en', 'indie', true, 2),
('NEON', 'en', 'indie', true, 2),
('Magnolia Pictures', 'en', 'indie', true, 2),
('IFC Films', 'en', 'indie', true, 2),
('STXfilms', 'en', 'indie', true, 2),
('STX Entertainment', 'en', 'indie', true, 2),
('Entertainment One', 'en', 'indie', true, 2),
('eOne Films', 'en', 'indie', true, 2),
('Bleecker Street', 'en', 'indie', true, 2),
('Annapurna Pictures', 'en', 'indie', true, 2),
('Roadside Attractions', 'en', 'indie', true, 2),
('FilmDistrict', 'en', 'indie', true, 2),
('Open Road Films', 'en', 'indie', true, 2),
('LD Entertainment', 'en', 'indie', true, 2),
('Vertical Entertainment', 'en', 'indie', true, 2),

-- Streaming Service Aliases
('Netflix Film', 'en', 'streaming', true, 1),
('Amazon Prime Video', 'en', 'streaming', true, 1),
('Apple TV+', 'en', 'streaming', true, 1),
('HBO', 'en', 'streaming', true, 1),
('HBO Max', 'en', 'streaming', true, 1),
('Max', 'en', 'streaming', true, 1),
('Peacock TV', 'en', 'streaming', true, 1),
('Disney+', 'en', 'streaming', true, 1),

-- International Studios
('Studio Ghibli', 'ja', 'studio', true, 1),
('StudioCanal', 'en', 'studio', true, 1),
('Film4', 'en', 'studio', true, 1),
('Working Title', 'en', 'studio', true, 1),
('Legendary Entertainment', 'en', 'studio', true, 1),

-- Horror/Genre Specialists
('Blumhouse', 'en', 'horror', true, 2),
('A24 Films', 'en', 'indie', true, 2),
('Shudder', 'en', 'horror', true, 2),
('Scream Factory', 'en', 'horror', true, 2),

-- Documentary Distributors
('National Geographic', 'en', 'documentary', true, 2),
('PBS', 'en', 'documentary', true, 2),
('Sundance', 'en', 'documentary', true, 2),
('HBO Documentary Films', 'en', 'documentary', true, 2),

-- Additional Major Studios
('DreamWorks', 'en', 'studio', true, 1),
('Amblin', 'en', 'studio', true, 1),
('New Line Cinema', 'en', 'studio', true, 1),
('Miramax', 'en', 'studio', true, 1),
('Relativity Media', 'en', 'studio', true, 1),
('Screen Gems', 'en', 'studio', true, 1),
('TriStar Pictures', 'en', 'studio', true, 1),
('Summit Entertainment', 'en', 'studio', true, 1),
('FilmNation', 'en', 'studio', true, 2),
('Plan B', 'en', 'studio', true, 2),
('Participant', 'en', 'documentary', true, 2),
('Lucasfilm', 'en', 'studio', true, 1),
('Pixar', 'en', 'studio', true, 1)
ON CONFLICT DO NOTHING;