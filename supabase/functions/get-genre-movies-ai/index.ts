import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to search TMDB as fallback
async function searchTMDB(title: string): Promise<{
  id: string;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  vote_average: number | null;
  release_date: string | null;
  original_language: string | null;
  title_type?: string | null;
} | null> {
  if (!tmdbApiKey) {
    console.log('[get-genre-movies-ai] TMDB_API_KEY not configured, skipping fallback');
    return null;
  }

  try {
    // Search for movies first
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&page=1`
    );
    const movieData = await movieResponse.json();
    
    if (movieData.results && movieData.results.length > 0) {
      const movie = movieData.results[0];
      return {
        id: `tmdb-movie-${movie.id}`,
        name: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        vote_average: movie.vote_average,
        release_date: movie.release_date,
        original_language: movie.original_language,
        title_type: 'movie'
      };
    }

    // If no movie found, search TV shows
    const tvResponse = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&page=1`
    );
    const tvData = await tvResponse.json();
    
    if (tvData.results && tvData.results.length > 0) {
      const tv = tvData.results[0];
      return {
        id: `tmdb-tv-${tv.id}`,
        name: tv.name,
        poster_path: tv.poster_path,
        backdrop_path: tv.backdrop_path,
        overview: tv.overview,
        vote_average: tv.vote_average,
        release_date: tv.first_air_date,
        original_language: tv.original_language,
        title_type: 'tv'
      };
    }

    return null;
  } catch (error) {
    console.error(`[get-genre-movies-ai] TMDB search error for "${title}":`, error);
    return null;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      languages = ['en', 'hi', 'ko'], 
      streamingServices = ['Netflix', 'Amazon Prime Video'],
      yearsBack = 3
    } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build language names for prompt
    const languageNames = languages.map((code: string) => {
      const langMap: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'ko': 'Korean',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'ja': 'Japanese',
        'zh': 'Chinese',
        'ta': 'Tamil',
        'te': 'Telugu'
      };
      return langMap[code] || code;
    });

    const prompt = `You are a movie database expert. List exactly ONE movie or series per genre that meets ALL criteria:

STRICT CRITERIA:
- Released in the past ${yearsBack} years (2022-2025)
- Original language must be one of: ${languageNames.join(', ')}
- Available on: ${streamingServices.join(' or ')}
- Critically acclaimed OR widely popular
- Each movie or series can only appear once (no duplicates)

IMPORTANT GENRE RULES:
- Animation: ONLY animated films (like Pixar, Disney, anime). NOT live-action films with animated elements.
- Documentary: ONLY non-fiction documentaries
- Each movie or series MUST be the PRIMARY genre listed - not secondary

GENRES (one movie or series each):
${GENRES.join('\n')}

OUTPUT FORMAT - Return ONLY valid JSON array:
[{"title": "Movie Name", "genre": "Action", "language": "Language name"}]

NO explanations, NO markdown, NO extra text. Start with [ and end with ]`;

    console.log('[get-genre-movies-ai] Calling OpenAI for', GENRES.length, 'genres, languages:', languageNames, 'services:', streamingServices);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a movie recommendation expert. You only respond with valid JSON arrays, no other text.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-genre-movies-ai] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim();
    
    console.log('[get-genre-movies-ai] Full AI response:', aiResponse);

    // Parse AI response
    let movieRecommendations: Array<{ title: string; genre: string; language: string }>;
    try {
      // Handle potential markdown code blocks
      let jsonStr = aiResponse;
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      movieRecommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[get-genre-movies-ai] Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI movie recommendations');
    }

    console.log('[get-genre-movies-ai] Parsed', movieRecommendations.length, 'movie recommendations');

    // Query titles table to find matching movies
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results: Array<{
      genre: string;
      title: {
        id: string;
        name: string;
        poster_path: string | null;
        backdrop_path: string | null;
        overview: string | null;
        vote_average: number | null;
        release_date: string | null;
        original_language: string | null;
        title_type?: string | null;
      } | null;
      ai_recommendation: { title: string; language: string };
      source: string;
    }> = [];

    // Query each title from the database (case-insensitive, movies or series)
    for (const rec of movieRecommendations) {
      const { data: titles, error } = await supabase
        .from('titles')
        .select('id, name, poster_path, backdrop_path, overview, vote_average, release_date, original_language, title_type')
        .ilike('name', rec.title)
        .limit(1);

      if (error) {
        console.error(`[get-genre-movies-ai] Error querying title "${rec.title}":`, error);
      }

      let titleData: {
        id: string;
        name: string;
        poster_path: string | null;
        backdrop_path: string | null;
        overview: string | null;
        vote_average: number | null;
        release_date: string | null;
        original_language: string | null;
        title_type?: string | null;
      } | null = titles && titles.length > 0 ? titles[0] : null;
      let source = 'database';

      // Fallback to TMDB if not found in database
      if (!titleData) {
        console.log(`[get-genre-movies-ai] "${rec.title}" not in DB, trying TMDB...`);
        titleData = await searchTMDB(rec.title);
        source = titleData ? 'tmdb' : 'not_found';
      }

      results.push({
        genre: rec.genre,
        title: titleData,
        ai_recommendation: { title: rec.title, language: rec.language },
        source
      });

      console.log(`[get-genre-movies-ai] ${rec.genre}: "${rec.title}" -> ${titleData ? `FOUND (${source})` : 'NOT FOUND'}`);
    }

    // Count found vs not found
    const found = results.filter(r => r.title !== null).length;
    const fromDb = results.filter(r => r.source === 'database').length;
    const fromTmdb = results.filter(r => r.source === 'tmdb').length;
    console.log(`[get-genre-movies-ai] Found ${found}/${results.length} (DB: ${fromDb}, TMDB: ${fromTmdb})`);

    return new Response(
      JSON.stringify({ 
        movies: results,
        stats: {
          total: results.length,
          found,
          fromDb,
          fromTmdb,
          notFound: results.length - found
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[get-genre-movies-ai] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
