import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import { logger } from '@/lib/services/LoggerService';
export interface AnalyticsData {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
    dailyTrend: { date: string; count: number }[];
  };
  sessions: {
    averageDuration: number;
    totalSessions: number;
    sessionsByTimeOfDay: { bucket: string; count: number }[];
  };
  moodUsage: {
    totalMoodEntries: number;
    usersWithMoodEntries: number;
    totalUsers: number;
    usagePercentage: number;
    emotionDistribution: { emotion: string; count: number }[];
  };
  recommendations: {
    total: number;
    accepted: number;
    acceptanceRate: number;
    ratingDistribution: { rating: string; count: number }[];
  };
  passRate: {
    passed: number;
    added: number;
    passRate: number;
  };
  titleWatch: {
    watchlistAdditions: number;
    titlesWatched: number;
    topTitles: { name: string; count: number }[];
  };
  socialActivity: {
    totalConnections: number;
    newConnectionsLast30Days: number;
    socialRecommendations: number;
    avgTrustScore: number;
  };
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
    totalSignups: number;
  };
}

export const useAnalytics = () => {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const data = await invokeEdgeFunction<AnalyticsData>('get-analytics');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
