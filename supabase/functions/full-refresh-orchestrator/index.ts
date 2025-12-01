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
    const { jobId, chunks, startIndex = 0 } = await req.json();

    if (!jobId || !chunks || !Array.isArray(chunks)) {
      throw new Error('Missing required parameters: jobId, chunks');
    }

    console.log(`Orchestrator started: dispatching ${chunks.length - startIndex} threads for job ${jobId}`);

    // Dispatch all threads asynchronously in the background
    const dispatchAllThreads = async () => {
      console.log(`Starting rapid dispatch of ${chunks.length - startIndex} threads...`);
      
      for (let i = startIndex; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Invoke the worker function (fire and forget)
          supabase.functions.invoke('full-refresh-titles', {
            body: {
              languageCode: chunk.languageCode,
              startYear: chunk.year,
              endYear: chunk.year,
              genreId: chunk.genreId,
              jobId: jobId
            }
          }).catch(error => {
            console.error(`Error dispatching thread ${i + 1}:`, error);
          });
          
          // Log every 100 threads
          if ((i - startIndex + 1) % 100 === 0) {
            console.log(`Dispatched ${i - startIndex + 1}/${chunks.length - startIndex} threads`);
          }
        } catch (error) {
          console.error(`Error dispatching thread ${i + 1}:`, error);
        }
      }
      
      console.log(`Orchestrator completed: all ${chunks.length - startIndex} threads dispatched for job ${jobId}`);
    };

    // Use waitUntil to ensure background task continues even if response is sent
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(dispatchAllThreads());

    // Return immediately - the job will continue running in the background
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Orchestrator started. Dispatching ${chunks.length - startIndex} threads in the background.`,
        jobId,
        totalThreads: chunks.length,
        startIndex
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in full-refresh-orchestrator:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
