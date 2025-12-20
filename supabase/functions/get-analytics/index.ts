import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsResponse {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

    console.log('Fetching analytics data...');

    // Parallel queries for efficiency
    const [
      usersResult,
      contextLogsResult,
      emotionStatesResult,
      recommendationsResult,
      interactionsResult,
      connectionsResult,
      socialRecsResult,
    ] = await Promise.all([
      // Total users
      supabase.from('users').select('id, created_at, is_active'),
      // Session/context logs
      supabase.from('user_context_logs').select('*').gte('created_at', thirtyDaysAgo),
      // Mood/emotion entries
      supabase.from('user_emotion_states').select('id, user_id, emotion_id, created_at').gte('created_at', thirtyDaysAgo),
      // Recommendation outcomes
      supabase.from('recommendation_outcomes').select('*').gte('created_at', thirtyDaysAgo),
      // Title interactions
      supabase.from('user_title_interactions').select('*, titles(name)').gte('created_at', thirtyDaysAgo),
      // Friend connections
      supabase.from('friend_connections').select('*'),
      // Social recommendations
      supabase.from('user_social_recommendations').select('*').gte('created_at', thirtyDaysAgo),
    ]);

    // Get emotion labels
    const emotionIds = [...new Set((emotionStatesResult.data || []).map(e => e.emotion_id))];
    const { data: emotionsData } = await supabase
      .from('emotion_master')
      .select('id, emotion_label')
      .in('id', emotionIds);
    const emotionMap = new Map((emotionsData || []).map(e => [e.id, e.emotion_label]));

    const users = usersResult.data || [];
    const contextLogs = contextLogsResult.data || [];
    const emotionStates = emotionStatesResult.data || [];
    const recommendations = recommendationsResult.data || [];
    const interactions = interactionsResult.data || [];
    const connections = connectionsResult.data || [];
    const socialRecs = socialRecsResult.data || [];

    // Active Users
    const usersWithActivity = new Set([
      ...contextLogs.map(l => l.user_id),
      ...emotionStates.map(e => e.user_id),
      ...interactions.map(i => i.user_id),
    ]);

    const dailyActiveUsers = new Set(
      [...contextLogs, ...emotionStates, ...interactions]
        .filter(l => new Date(l.created_at) >= new Date(oneDayAgo))
        .map(l => l.user_id)
    ).size;

    const weeklyActiveUsers = new Set(
      [...contextLogs, ...emotionStates, ...interactions]
        .filter(l => new Date(l.created_at) >= new Date(sevenDaysAgo))
        .map(l => l.user_id)
    ).size;

    const monthlyActiveUsers = usersWithActivity.size;

    // Daily trend for last 30 days
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const count = new Set(
        [...contextLogs, ...emotionStates, ...interactions]
          .filter(l => {
            const d = new Date(l.created_at);
            return d >= date && d < nextDate;
          })
          .map(l => l.user_id)
      ).size;
      
      dailyTrend.push({ date: dateStr, count });
    }

    // Sessions
    const validSessions = contextLogs.filter(l => l.session_length_seconds != null);
    const avgDuration = validSessions.length > 0
      ? validSessions.reduce((sum, l) => sum + (l.session_length_seconds || 0), 0) / validSessions.length
      : 0;

    const sessionsByTimeOfDay = ['morning', 'afternoon', 'evening', 'night', 'late_night'].map(bucket => ({
      bucket,
      count: contextLogs.filter(l => l.time_of_day_bucket === bucket).length,
    }));

    // Mood Usage
    const usersWithMood = new Set(emotionStates.map(e => e.user_id)).size;
    const emotionDistribution = Object.entries(
      emotionStates.reduce((acc, e) => {
        const label = emotionMap.get(e.emotion_id) || 'unknown';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recommendations
    const acceptedRecs = recommendations.filter(r => r.was_selected);
    const ratingDistribution = ['love_it', 'like_it', 'ok', 'dislike_it', 'not_rated'].map(rating => ({
      rating,
      count: recommendations.filter(r => r.rating_value === rating).length,
    }));

    // Pass Rate (using interactions - wishlisted vs ignored)
    const wishlistedCount = interactions.filter(i => i.interaction_type === 'wishlisted').length;
    const ignoredCount = interactions.filter(i => i.interaction_type === 'ignored').length;
    const passRateValue = (wishlistedCount + ignoredCount) > 0
      ? (ignoredCount / (wishlistedCount + ignoredCount)) * 100
      : 0;

    // Title Watch
    const watchlistAdditions = interactions.filter(i => i.interaction_type === 'wishlisted').length;
    const titlesWatched = interactions.filter(i => ['started', 'completed'].includes(i.interaction_type)).length;
    
    const titleCounts = interactions.reduce((acc, i) => {
      const name = (i as any).titles?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topTitles = Object.entries(titleCounts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Social Activity
    const newConnectionsLast30Days = connections.filter(c => new Date(c.created_at) >= new Date(thirtyDaysAgo)).length;
    const avgTrustScore = connections.length > 0
      ? connections.reduce((sum, c) => sum + (c.trust_score || 0), 0) / connections.length
      : 0;

    // User Retention
    const totalSignups = users.length;
    const day1Retention = users.filter(u => {
      const signupDate = new Date(u.created_at);
      const nextDay = new Date(signupDate.getTime() + 24 * 60 * 60 * 1000);
      return [...contextLogs, ...emotionStates, ...interactions].some(l => 
        l.user_id === u.id && new Date(l.created_at) >= nextDay
      );
    }).length;

    const day7Retention = users.filter(u => {
      const signupDate = new Date(u.created_at);
      const day7 = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return [...contextLogs, ...emotionStates, ...interactions].some(l => 
        l.user_id === u.id && new Date(l.created_at) >= day7
      );
    }).length;

    const day30Retention = users.filter(u => {
      const signupDate = new Date(u.created_at);
      const day30 = new Date(signupDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return [...contextLogs, ...emotionStates, ...interactions].some(l => 
        l.user_id === u.id && new Date(l.created_at) >= day30
      );
    }).length;

    const analytics: AnalyticsResponse = {
      activeUsers: {
        daily: dailyActiveUsers,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers,
        dailyTrend,
      },
      sessions: {
        averageDuration: Math.round(avgDuration),
        totalSessions: contextLogs.length,
        sessionsByTimeOfDay,
      },
      moodUsage: {
        totalMoodEntries: emotionStates.length,
        usersWithMoodEntries: usersWithMood,
        totalUsers: users.length,
        usagePercentage: users.length > 0 ? Math.round((usersWithMood / users.length) * 100) : 0,
        emotionDistribution,
      },
      recommendations: {
        total: recommendations.length,
        accepted: acceptedRecs.length,
        acceptanceRate: recommendations.length > 0 
          ? Math.round((acceptedRecs.length / recommendations.length) * 100) 
          : 0,
        ratingDistribution,
      },
      passRate: {
        passed: ignoredCount,
        added: wishlistedCount,
        passRate: Math.round(passRateValue),
      },
      titleWatch: {
        watchlistAdditions,
        titlesWatched,
        topTitles,
      },
      socialActivity: {
        totalConnections: connections.length,
        newConnectionsLast30Days,
        socialRecommendations: socialRecs.length,
        avgTrustScore: Math.round(avgTrustScore * 100) / 100,
      },
      userRetention: {
        day1: totalSignups > 0 ? Math.round((day1Retention / totalSignups) * 100) : 0,
        day7: totalSignups > 0 ? Math.round((day7Retention / totalSignups) * 100) : 0,
        day30: totalSignups > 0 ? Math.round((day30Retention / totalSignups) * 100) : 0,
        totalSignups,
      },
    };

    console.log('Analytics data compiled successfully');

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
