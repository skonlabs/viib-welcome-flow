import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping for readable logging
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
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

    console.log(`Orchestrator started: dispatching ${chunks.length - startIndex} threads for job ${jobId} from index ${startIndex}`);

    // Dispatch threads in batches with proper concurrency control
    const dispatchAllThreads = async () => {
      const BATCH_SIZE = 15; // Process 15 threads concurrently per batch
      const BATCH_DELAY_MS = 5000; // 5 second delay between batches
      const MAX_ORCHESTRATOR_RUNTIME_MS = 240000; // 4 minutes safety margin before timeout
      const orchestratorStartTime = Date.now();
      const totalThreads = chunks.length - startIndex;
      const totalBatches = Math.ceil(totalThreads / BATCH_SIZE);
      
      console.log(`Starting batch dispatch: ${totalThreads} threads in ${totalBatches} batches of ${BATCH_SIZE}`);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = startIndex + (batchIndex * BATCH_SIZE);
        const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
        const batchNumber = batchIndex + 1;
        
        // Check if approaching orchestrator timeout BEFORE starting this batch
        const orchestratorElapsed = Date.now() - orchestratorStartTime;
        if (orchestratorElapsed > MAX_ORCHESTRATOR_RUNTIME_MS) {
          const nextStartIndex = batchStart; // Start next orchestrator from THIS batch
          console.log(`Orchestrator approaching timeout at ${orchestratorElapsed}ms. Stopping at batch ${batchNumber}. Next start index: ${nextStartIndex}`);
          
          // Log timeout to system_logs
          await supabase.from('system_logs').insert({
            severity: 'warning',
            operation: 'full-refresh-orchestrator-timeout',
            error_message: `Orchestrator approaching timeout at ${orchestratorElapsed}ms after processing ${batchStart} threads`,
            context: {
              jobId,
              batchNumber,
              totalBatches,
              threadsProcessed: batchStart,
              totalThreads: chunks.length,
              elapsedMs: orchestratorElapsed,
              nextStartIndex
            }
          });
          
          // Relaunch orchestrator with remaining chunks
          console.log(`Relaunching orchestrator for remaining ${chunks.length - nextStartIndex} threads...`);
          await supabase.functions.invoke('full-refresh-orchestrator', {
            body: { jobId, chunks, startIndex: nextStartIndex }
          });
          
          return; // Exit current orchestrator
        }
        
        console.log(`Starting batch ${batchNumber}/${totalBatches}: threads ${batchStart + 1} to ${batchEnd}`);
        
        // Check if job was stopped before starting batch
        const { data: jobStatus, error: statusError } = await supabase
          .from('jobs')
          .select('status, error_message, updated_at')
          .eq('id', jobId)
          .single();
        
        console.log(`Status check before batch ${batchNumber}:`, { 
          status: jobStatus?.status, 
          error_message: jobStatus?.error_message,
          updated_at: jobStatus?.updated_at,
          statusError 
        });
        
        if (jobStatus?.status === 'failed' || jobStatus?.status === 'idle') {
          console.error(`Job ${jobId} status changed to '${jobStatus.status}'. Error: ${jobStatus.error_message}. Halting orchestration at batch ${batchNumber}.`);
          
          // Log job stoppage to system_logs
          await supabase.from('system_logs').insert({
            severity: 'error',
            operation: 'full-refresh-orchestrator-stopped',
            error_message: `Job manually stopped or failed. Status: ${jobStatus.status}. ${jobStatus.error_message || ''}`,
            context: {
              jobId,
              status: jobStatus.status,
              batchNumber,
              totalBatches,
              threadsProcessed: batchStart,
              totalThreads: chunks.length,
              errorMessage: jobStatus.error_message
            }
          });
          
          break;
        }
        
        // Dispatch all threads in current batch simultaneously
        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = chunks[i];
          const threadNum = i + 1;
          
          const promise = supabase.functions.invoke('full-refresh-titles', {
            body: {
              languageCode: chunk.languageCode,
              startYear: chunk.year,
              endYear: chunk.year,
              genreId: chunk.genreId,
              jobId: jobId
            }
          }).catch(async error => {
            console.error(`Error dispatching thread ${threadNum}:`, error);
            
            // Map genreId to genre name for logging
            const genreName = GENRE_MAP[chunk.genreId] || 'Unknown';
            
            // Log dispatch failure to system_logs
            await supabase.from('system_logs').insert({
              severity: 'error',
              operation: 'full-refresh-thread-dispatch-failed',
              error_message: `Failed to dispatch thread ${threadNum} for ${chunk.languageCode}/${chunk.year}/${genreName}: ${error.message || String(error)}`,
              error_stack: error.stack || null,
              context: {
                jobId,
                threadNum,
                batchNumber,
                languageCode: chunk.languageCode,
                year: chunk.year,
                genreId: chunk.genreId,
                genreName: genreName,
                chunk
              }
            });
            
            return { error };
          });
          
          batchPromises.push(promise);
        }
        
        // Wait for all threads in this batch to complete
        await Promise.all(batchPromises);
        console.log(`Batch ${batchNumber}/${totalBatches} completed (threads ${batchStart + 1}-${batchEnd})`);
        
        // Add delay between batches to prevent overwhelming Supabase
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${BATCH_DELAY_MS}ms before starting next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      
      console.log(`Orchestrator completed: all ${totalThreads} threads dispatched in ${totalBatches} batches for job ${jobId}`);
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
