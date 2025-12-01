-- Add unique constraint for tmdb_id and content_type combination
-- This allows upsert operations in full-refresh and sync-delta jobs

ALTER TABLE titles 
ADD CONSTRAINT titles_tmdb_id_content_type_unique 
UNIQUE (tmdb_id, content_type);