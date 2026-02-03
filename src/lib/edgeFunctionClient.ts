/**
 * Edge Function Client
 * Utility for calling Supabase Edge Functions with proper authentication
 * 
 * This ensures the Authorization header is explicitly included in all requests
 * All errors are logged to the system_logs table for admin visibility
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://ibrjwldvyuhwcfzdmimv.supabase.co';

export interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * Log error to system_logs table
 */
async function logErrorToSystemLogs(
  error: Error | EdgeFunctionError,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const viibUserId = localStorage.getItem('viib_user_id');
    
    const { error: insertError } = await supabase.from('system_logs').insert([{
      error_message: error.message,
      error_stack: error.stack || null,
      severity: 'error',
      user_id: viibUserId || null,
      context: context as Json,
      operation: (context.operation as string) || 'edge-function-call',
      screen: typeof window !== 'undefined' ? window.location.pathname : null,
      resolved: false
    }]);
    
    if (insertError && import.meta.env.DEV) {
      console.error('Failed to log error to system_logs:', insertError);
    }
  } catch (loggingError) {
    // Silently fail - don't break the app if logging fails
    if (import.meta.env.DEV) {
      console.error('Failed to log error to system_logs:', loggingError);
    }
  }
}

/**
 * Invoke a Supabase Edge Function with proper authentication
 * All errors are automatically logged to system_logs
 * @param functionName - The name of the edge function to call
 * @param options - Optional request options (method, body, headers)
 * @returns The response data from the edge function
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const { method = 'POST', body, headers: customHeaders = {} } = options;

  // Get the current session to extract the access token
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    const error = new EdgeFunctionError('Failed to get session', 401, sessionError);
    await logErrorToSystemLogs(error, {
      operation: `edge-function-${functionName}`,
      functionName,
      errorType: 'session_error'
    });
    throw error;
  }

  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    const error = new EdgeFunctionError('No active session. Please sign in again.', 401);
    await logErrorToSystemLogs(error, {
      operation: `edge-function-${functionName}`,
      functionName,
      errorType: 'no_session'
    });
    throw error;
  }

  // Build headers with explicit Authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlicmp3bGR2eXVod2NmemRtaW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDUzMjIsImV4cCI6MjA3OTUyMTMyMn0.bCR6cHo5o_eiVeozyjPZv9tc-7v3Dj98a3lfUEUYyCI',
    ...customHeaders,
  };

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      
      const error = new EdgeFunctionError(
        `Edge function returned ${response.status}: ${response.statusText}`,
        response.status,
        errorDetails
      );
      
      // Log error to system_logs
      await logErrorToSystemLogs(error, {
        operation: `edge-function-${functionName}`,
        functionName,
        method,
        httpStatus: response.status,
        errorDetails,
        errorType: 'http_error'
      });
      
      throw error;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof EdgeFunctionError) {
      throw error;
    }
    
    const wrappedError = new EdgeFunctionError(
      error instanceof Error ? error.message : 'Unknown error calling edge function',
      500,
      error
    );
    
    // Log error to system_logs
    await logErrorToSystemLogs(wrappedError, {
      operation: `edge-function-${functionName}`,
      functionName,
      method,
      errorType: 'network_error',
      originalError: error instanceof Error ? error.message : String(error)
    });
    
    throw wrappedError;
  }
}
