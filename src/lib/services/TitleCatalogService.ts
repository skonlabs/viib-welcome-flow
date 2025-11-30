// TMDB API Integration for Movie and TV Show Search
const TMDB_API_KEY = 'a6e4ba96d27c6c65f2b5e91cf0c6e485';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TitleWithAvailability {
  external_id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  poster_url?: string;
  genres?: string[];
  synopsis?: string;
  rating?: number;
  runtime?: number;
}

class TitleCatalogServiceClass {
  private genreMap: Map<number, string> = new Map();

  constructor() {
    this.initializeGenres();
  }

  private async initializeGenres() {
    try {
      const [movieGenres, tvGenres] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`).then(r => r.json()),
        fetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`).then(r => r.json())
      ]);

      [...movieGenres.genres, ...tvGenres.genres].forEach((g: any) => {
        this.genreMap.set(g.id, g.name);
      });
    } catch (error) {
      console.error('Failed to load TMDB genres:', error);
    }
  }

  async searchTitles(query: string, genres?: string[]): Promise<TitleWithAvailability[]> {
    try {
      if (!query || query.trim() === '' || query === 'popular') {
        return this.getPopularTitles();
      }

      const [movieResults, tvResults] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`).then(r => r.json()),
        fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`).then(r => r.json())
      ]);

      const movies = (movieResults.results || []).map((m: any) => this.mapMovie(m));
      const tv = (tvResults.results || []).map((t: any) => this.mapTVShow(t));
      
      let combined = [...movies, ...tv];

      // Filter by genres if specified
      if (genres && genres.length > 0) {
        combined = combined.filter(title => 
          title.genres?.some(g => genres.includes(g))
        );
      }

      return combined.slice(0, 20);
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  }

  async getTitleById(id: string): Promise<TitleWithAvailability | null> {
    try {
      const [movieData, tvData] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (movieData) return this.mapMovie(movieData);
      if (tvData) return this.mapTVShow(tvData);
      return null;
    } catch (error) {
      console.error('TMDB getTitleById error:', error);
      return null;
    }
  }

  async getPopularTitles(): Promise<TitleWithAvailability[]> {
    try {
      const [movieResults, tvResults] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`).then(r => r.json()),
        fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`).then(r => r.json())
      ]);

      const movies = (movieResults.results || []).slice(0, 10).map((m: any) => this.mapMovie(m));
      const tv = (tvResults.results || []).slice(0, 10).map((t: any) => this.mapTVShow(t));

      return [...movies, ...tv];
    } catch (error) {
      console.error('TMDB getPopularTitles error:', error);
      return [];
    }
  }

  private mapMovie(movie: any): TitleWithAvailability {
    return {
      external_id: `movie_${movie.id}`,
      title: movie.title || movie.original_title,
      type: 'movie',
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : undefined,
      genres: movie.genre_ids?.map((id: number) => this.genreMap.get(id)).filter(Boolean) || 
              movie.genres?.map((g: any) => g.name) || [],
      synopsis: movie.overview,
      rating: movie.vote_average,
      runtime: movie.runtime
    };
  }

  private mapTVShow(tv: any): TitleWithAvailability {
    return {
      external_id: `tv_${tv.id}`,
      title: tv.name || tv.original_name,
      type: 'series',
      year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
      poster_url: tv.poster_path ? `${TMDB_IMAGE_BASE}${tv.poster_path}` : undefined,
      genres: tv.genre_ids?.map((id: number) => this.genreMap.get(id)).filter(Boolean) || 
              tv.genres?.map((g: any) => g.name) || [],
      synopsis: tv.overview,
      rating: tv.vote_average,
      runtime: tv.episode_run_time?.[0]
    };
  }
}

export const titleCatalogService = new TitleCatalogServiceClass();
