import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch all failed thread logs that haven't been resolved
    const { data: failedLogs, error: fetchError } = await supabase
      .from('system_logs')
      .select('id, context, error_message, created_at')
      .in('operation', ['full-refresh-thread-dispatch-failed', 'full-refresh-titles-error'])
      .eq('resolved', false)
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 failed threads at a time

    if (fetchError) {
      throw new Error(`Failed to fetch failed threads: ${fetchError.message}`);
    }

    if (!failedLogs || failedLogs.length === 0) {
      console.log('No failed threads to retry');
      return new Response(
        JSON.stringify({ message: 'No failed threads to retry', retriedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedLogs.length} failed threads to retry`);

    const retryResults = [];

    // Process each failed thread
    for (const log of failedLogs) {
      const context = log.context as any;
      const retryParams = context?.edge_function_body || context?.retry_parameters;

      if (!retryParams || !retryParams.languageCode || !retryParams.genreId) {
        console.log(`Skipping log ${log.id}: Missing retry parameters`);
        continue;
      }

      console.log(`Retrying: ${retryParams.languageCode}/${retryParams.startYear || retryParams.year}/${context.retry_parameters?.genreName || 'Unknown'}`);

      try {
        // Invoke the full-refresh-titles function with the failed parameters
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke('full-refresh-titles', {
          body: {
            languageCode: retryParams.languageCode,
            startYear: retryParams.startYear || retryParams.year,
            endYear: retryParams.endYear || retryParams.year,
            genreId: retryParams.genreId,
            jobId: retryParams.jobId
          }
        });

        if (invokeError) {
          console.error(`Retry failed for log ${log.id}:`, invokeError);
          retryResults.push({
            logId: log.id,
            status: 'failed',
            error: invokeError.message,
            params: retryParams
          });
          continue;
        }

        // Success! Mark the log as resolved and delete it
        const { error: deleteError } = await supabase
          .from('system_logs')
          .delete()
          .eq('id', log.id);

        if (deleteError) {
          console.error(`Failed to delete log ${log.id}:`, deleteError);
        } else {
          console.log(`Successfully retried and deleted log ${log.id}`);
        }

        retryResults.push({
          logId: log.id,
          status: 'success',
          params: retryParams,
          result: invokeData
        });

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Exception retrying log ${log.id}:`, error);
        retryResults.push({
          logId: log.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          params: retryParams
        });
      }
    }

    const successCount = retryResults.filter(r => r.status === 'success').length;
    const failedCount = retryResults.filter(r => r.status === 'failed' || r.status === 'error').length;

    console.log(`Retry complete: ${successCount} succeeded, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Retry completed',
        retriedCount: retryResults.length,
        successCount,
        failedCount,
        results: retryResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retry-failed-threads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
