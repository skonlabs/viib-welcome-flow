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

    // Dispatch all threads in batches to avoid overwhelming the system
    const dispatchAllThreads = async () => {
      const BATCH_SIZE = 50; // Dispatch 50 threads at a time
      const BATCH_DELAY_MS = 2000; // 2 second delay between batches
      const totalThreads = chunks.length - startIndex;
      
      console.log(`Starting batched dispatch: ${totalThreads} threads in batches of ${BATCH_SIZE}`);
      
      for (let batchStart = startIndex; batchStart < chunks.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
        const batchNum = Math.floor((batchStart - startIndex) / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalThreads / BATCH_SIZE);
        
        // Check if job was stopped
        const { data: jobStatus } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();
        
        if (jobStatus?.status === 'failed' || jobStatus?.status === 'idle') {
          console.log(`Job ${jobId} was stopped. Halting orchestration at batch ${batchNum}.`);
          break;
        }
        
        console.log(`Dispatching batch ${batchNum}/${totalBatches} (threads ${batchStart + 1}-${batchEnd})...`);
        
        // Dispatch all threads in current batch simultaneously
        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = chunks[i];
          const invokePromise = supabase.functions.invoke('full-refresh-titles', {
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
          batchPromises.push(invokePromise);
        }
        
        // Wait for all threads in batch to be dispatched
        await Promise.all(batchPromises);
        
        console.log(`Batch ${batchNum}/${totalBatches} dispatched successfully`);
        
        // Wait before next batch (except for last batch)
        if (batchEnd < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      
      console.log(`Orchestrator completed: all batches dispatched for job ${jobId}`);
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
