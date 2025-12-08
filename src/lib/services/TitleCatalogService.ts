export interface Title {
  id?: string;
  external_id?: string;
  tmdb_id?: number;
  title: string;
  name?: string;
  type: 'movie' | 'series';
  title_type?: string;
  year?: number;
  description?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  genres: string[];
  vote_average?: number;
  popularity?: number;
  runtime?: number;
  runtime_minutes?: number;
  original_language?: string;
}

export interface TitleWithAvailability extends Title {
  mood_tags?: string[];
  cast?: string[];
  certification?: string;
  number_of_seasons?: number;
  avg_episode_minutes?: number;
  streaming_services?: Array<{
    service_code: string;
    service_name: string;
    logo_url?: string | null;
  }>;
  availability?: Array<{
    service_name: string;
    service_code: string;
    watch_url: string;
    logo_url?: string | null;
  }>;
}

// Helper to get full poster URL from TMDB path
export const getPosterUrl = (posterPath: string | null | undefined, size: string = 'w500'): string => {
  if (!posterPath) return 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop';
  if (posterPath.startsWith('http')) return posterPath;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
};

// Helper to get full backdrop URL from TMDB path
export const getBackdropUrl = (backdropPath: string | null | undefined, size: string = 'w1280'): string | null => {
  if (!backdropPath) return null;
  if (backdropPath.startsWith('http')) return backdropPath;
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
};

class TitleCatalogService {
  // This service is primarily used via the search-tmdb edge function
  // No direct TMDB API calls from client side
}

export const titleCatalogService = new TitleCatalogService();
