-- Update title_genres column with JSON array of genre names from title_genres junction table
UPDATE titles t
SET title_genres = (
  SELECT json_agg(g.genre_name ORDER BY g.genre_name)
  FROM title_genres tg
  JOIN genres g ON g.id = tg.genre_id
  WHERE tg.title_id = t.id
)
WHERE EXISTS (
  SELECT 1 FROM title_genres tg WHERE tg.title_id = t.id
);