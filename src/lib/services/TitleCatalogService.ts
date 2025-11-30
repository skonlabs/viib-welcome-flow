export interface Title {
  id?: string;
  external_id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  genres: string[];
  rating?: number;
}

export interface TitleWithAvailability extends Title {
  mood_tags: string[];
  availability?: Array<{
    service_name: string;
    service_code: string;
    watch_url: string;
    logo_url?: string;
  }>;
}

class TitleCatalogService {
  // This service is primarily used via the search-tmdb edge function
  // No direct TMDB API calls from client side
}

export const titleCatalogService = new TitleCatalogService();
