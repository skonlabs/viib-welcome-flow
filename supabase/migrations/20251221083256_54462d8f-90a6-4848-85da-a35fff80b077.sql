-- Fix old placeholder values to new consistent format
UPDATE titles SET poster_path = '[no-poster]' WHERE poster_path = '/no-poster';
UPDATE titles SET overview = '[no-overview]' WHERE overview = '[No overview available]';