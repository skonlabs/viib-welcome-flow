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

    // Fetch job configuration to get completed work units
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('configuration, status')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Check if job was stopped before we start
    if (jobData.status === 'failed' || jobData.status === 'idle') {
      console.log(`Job ${jobId} is not running (status: ${jobData.status}). Aborting orchestrator.`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Job is not running (status: ${jobData.status})`,
          jobId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = jobData.configuration || {};
    const completedUnits = config.completed_work_units || [];
    const failedUnits = config.failed_work_units || [];

    // Filter out already-completed chunks
    const remainingChunks = chunks.filter((chunk: any) => {
      const isCompleted = completedUnits.some((unit: any) => 
        unit.languageCode === chunk.languageCode && 
        unit.year === chunk.year && 
        unit.genreId === chunk.genreId
      );
      return !isCompleted;
    });

    console.log(`Orchestrator started: ${remainingChunks.length} remaining threads (${completedUnits.length} already completed) for job ${jobId}`);

    // Dispatch threads in batches with proper concurrency control
    const dispatchAllThreads = async () => {
      const BATCH_SIZE = 5; // Process 5 threads concurrently per batch
      const BATCH_DELAY_MS = 5000; // 5 second delay between batches
      const MAX_ORCHESTRATOR_RUNTIME_MS = 300000; // 5 minutes safety margin before timeout
      const orchestratorStartTime = Date.now();
      const totalThreads = remainingChunks.length;
      const totalBatches = Math.ceil(totalThreads / BATCH_SIZE);
      
      console.log(`Starting batch dispatch: ${totalThreads} threads in ${totalBatches} batches of ${BATCH_SIZE}`);
      
      let wasStoppedByAdmin = false;
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, remainingChunks.length);
        const batchNumber = batchIndex + 1;
        
        // Check if approaching orchestrator timeout BEFORE starting this batch
        const orchestratorElapsed = Date.now() - orchestratorStartTime;
        if (orchestratorElapsed > MAX_ORCHESTRATOR_RUNTIME_MS) {
          console.log(`Orchestrator approaching timeout at ${orchestratorElapsed}ms. Stopping at batch ${batchNumber}.`);
          
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
              totalThreads: remainingChunks.length,
              elapsedMs: orchestratorElapsed,
              completedCount: completedUnits.length,
              totalWorkUnits: chunks.length
            }
          });
          
          // Relaunch orchestrator with ALL original chunks (filtering happens on next invocation)
          console.log(`Relaunching orchestrator to continue processing...`);
          await supabase.functions.invoke('full-refresh-orchestrator', {
            body: { jobId, chunks, startIndex: 0 }
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
          wasStoppedByAdmin = true;
          
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
        
        // Dispatch all threads in current batch and collect results
        const batchPromises = [];
        const batchChunks: any[] = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = remainingChunks[i];
          batchChunks.push(chunk);
          
          const promise = supabase.functions.invoke('full-refresh-titles', {
            body: {
              languageCode: chunk.languageCode,
              startYear: chunk.year,
              endYear: chunk.year,
              genreId: chunk.genreId,
              jobId: jobId
            }
          }).then(result => {
            return { success: !result.error, chunk, result };
          }).catch(error => {
            console.error(`Error dispatching thread for ${chunk.languageCode}/${chunk.year}/${chunk.genreId}:`, error);
            return { success: false, chunk, error };
          });
          
          batchPromises.push(promise);
        }
        
        // Wait for all threads in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process results and update job configuration
        const newCompletedUnits: any[] = [];
        const newFailedUnits: any[] = [];
        
        for (const result of batchResults) {
          const genreName = GENRE_MAP[result.chunk.genreId] || 'Unknown';
          
          if (result.success) {
            newCompletedUnits.push({
              languageCode: result.chunk.languageCode,
              year: result.chunk.year,
              genreId: result.chunk.genreId,
              genreName,
              completedAt: new Date().toISOString()
            });
          } else {
            const errorMsg = 'error' in result ? (result.error?.message || 'Unknown error') : 'Unknown error';
            newFailedUnits.push({
              languageCode: result.chunk.languageCode,
              year: result.chunk.year,
              genreId: result.chunk.genreId,
              genreName,
              error: errorMsg,
              attempts: 1,
              failedAt: new Date().toISOString()
            });
          }
        }
        
        // Update job configuration with new completed/failed units
        const { data: currentJobData } = await supabase
          .from('jobs')
          .select('configuration')
          .eq('id', jobId)
          .single();
        
        const currentConfig = currentJobData?.configuration || {};
        const updatedCompletedUnits = [...(currentConfig.completed_work_units || []), ...newCompletedUnits];
        const updatedFailedUnits = [...(currentConfig.failed_work_units || []), ...newFailedUnits];
        
        await supabase
          .from('jobs')
          .update({
            configuration: {
              ...currentConfig,
              completed_work_units: updatedCompletedUnits,
              failed_work_units: updatedFailedUnits,
              thread_tracking: {
                succeeded: updatedCompletedUnits.length,
                failed: updatedFailedUnits.length
              }
            }
          })
          .eq('id', jobId);
        
        console.log(`Batch ${batchNumber}/${totalBatches} completed. Success: ${newCompletedUnits.length}, Failed: ${newFailedUnits.length}`);
        
        // Add delay between batches to prevent overwhelming Supabase
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${BATCH_DELAY_MS}ms before starting next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
      
      // If job was stopped, don't proceed to retry phase
      if (wasStoppedByAdmin) {
        console.log(`Job was stopped by admin. Skipping retry phase.`);
        return;
      }
      
      // RETRY FAILED THREADS
      // After all new threads complete, automatically retry any previously failed threads
      const { data: retryJobData } = await supabase
        .from('jobs')
        .select('configuration, status')
        .eq('id', jobId)
        .single();
      
      // Check again if job was stopped
      if (retryJobData?.status === 'failed' || retryJobData?.status === 'idle') {
        console.log(`Job stopped before retry phase. Aborting.`);
        return;
      }
      
      const retryConfig = retryJobData?.configuration || {};
      const failedUnitsToRetry = retryConfig.failed_work_units || [];
      
      if (failedUnitsToRetry.length > 0) {
        console.log(`Found ${failedUnitsToRetry.length} failed threads to retry`);
        
        const retryBatchSize = 5;
        const totalRetryBatches = Math.ceil(failedUnitsToRetry.length / retryBatchSize);
        
        for (let retryBatchIndex = 0; retryBatchIndex < totalRetryBatches; retryBatchIndex++) {
          const retryBatchStart = retryBatchIndex * retryBatchSize;
          const retryBatchEnd = Math.min(retryBatchStart + retryBatchSize, failedUnitsToRetry.length);
          const retryBatchNum = retryBatchIndex + 1;
          
          console.log(`Starting retry batch ${retryBatchNum}/${totalRetryBatches}: retrying ${retryBatchStart + 1} to ${retryBatchEnd}`);
          
          const retryPromises = [];
          const retryChunks: any[] = [];
          
          for (let i = retryBatchStart; i < retryBatchEnd; i++) {
            const failedUnit = failedUnitsToRetry[i];
            retryChunks.push(failedUnit);
            
            const promise = supabase.functions.invoke('full-refresh-titles', {
              body: {
                languageCode: failedUnit.languageCode,
                startYear: failedUnit.year,
                endYear: failedUnit.year,
                genreId: failedUnit.genreId,
                jobId: jobId
              }
            }).then(result => {
              return { success: !result.error, unit: failedUnit, result };
            }).catch(error => {
              return { success: false, unit: failedUnit, error };
            });
            
            retryPromises.push(promise);
          }
          
          const retryResults = await Promise.all(retryPromises);
          
          // Update job configuration: move successful retries to completed, update remaining failures
          const { data: retryUpdateData } = await supabase
            .from('jobs')
            .select('configuration')
            .eq('id', jobId)
            .single();
          
          const updateConfig = retryUpdateData?.configuration || {};
          let currentCompletedUnits = updateConfig.completed_work_units || [];
          let currentFailedUnits = updateConfig.failed_work_units || [];
          
          for (const result of retryResults) {
            const genreName = GENRE_MAP[result.unit.genreId] || 'Unknown';
            
            if (result.success) {
              console.log(`Retry succeeded: ${result.unit.languageCode}/${result.unit.year}/${genreName}`);
              
              // Add to completed
              currentCompletedUnits.push({
                languageCode: result.unit.languageCode,
                year: result.unit.year,
                genreId: result.unit.genreId,
                genreName,
                completedAt: new Date().toISOString(),
                wasRetry: true
              });
              
              // Remove from failed
              currentFailedUnits = currentFailedUnits.filter((u: any) => 
                !(u.languageCode === result.unit.languageCode && 
                  u.year === result.unit.year && 
                  u.genreId === result.unit.genreId)
              );
            } else {
              console.error(`Retry failed: ${result.unit.languageCode}/${result.unit.year}/${genreName}`);
              
              // Update attempts count
              currentFailedUnits = currentFailedUnits.map((u: any) => {
                if (u.languageCode === result.unit.languageCode && 
                    u.year === result.unit.year && 
                    u.genreId === result.unit.genreId) {
                  return { ...u, attempts: (u.attempts || 0) + 1, lastAttempt: new Date().toISOString() };
                }
                return u;
              });
            }
          }
          
          await supabase
            .from('jobs')
            .update({
              configuration: {
                ...updateConfig,
                completed_work_units: currentCompletedUnits,
                failed_work_units: currentFailedUnits,
                thread_tracking: {
                  succeeded: currentCompletedUnits.length,
                  failed: currentFailedUnits.length
                }
              }
            })
            .eq('id', jobId);
          
          console.log(`Retry batch ${retryBatchNum}/${totalRetryBatches} completed`);
          
          if (retryBatchIndex < totalRetryBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      }
      
      // FINAL: Mark job as completed
      const { data: finalJobData } = await supabase
        .from('jobs')
        .select('configuration, status')
        .eq('id', jobId)
        .single();
      
      // Don't mark complete if job was stopped
      if (finalJobData?.status === 'failed' || finalJobData?.status === 'idle') {
        console.log(`Job was stopped. Not marking as complete.`);
        return;
      }
      
      const finalConfig = finalJobData?.configuration || {};
      const finalCompleted = finalConfig.completed_work_units || [];
      const finalFailed = finalConfig.failed_work_units || [];
      const startTime = finalConfig.start_time || Date.now();
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      console.log(`Orchestrator completed: ${finalCompleted.length}/${chunks.length} threads completed, ${finalFailed.length} failed for job ${jobId}`);
      
      // Mark job as completed
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          last_run_duration_seconds: durationSeconds,
          error_message: finalFailed.length > 0 
            ? `Completed with ${finalFailed.length} failed work unit(s)` 
            : null
        })
        .eq('id', jobId);
      
      console.log(`Job ${jobId} marked as completed. Duration: ${durationSeconds}s`);
    };

    // Use waitUntil to ensure background task continues even if response is sent
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(dispatchAllThreads());

    // Return immediately - the job will continue running in the background
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Orchestrator started. Dispatching ${remainingChunks.length} remaining threads in the background.`,
        jobId,
        totalThreads: chunks.length,
        remainingThreads: remainingChunks.length,
        completedThreads: completedUnits.length,
        failedThreads: failedUnits.length
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
