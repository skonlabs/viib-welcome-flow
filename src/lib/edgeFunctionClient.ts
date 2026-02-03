/**
 * Edge Function Client
 * Utility for calling Supabase Edge Functions with proper authentication
 * 
 * This ensures the Authorization header is explicitly included in all requests
 */

import { supabase } from '@/integrations/supabase/client';

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
 * Invoke a Supabase Edge Function with proper authentication
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
    throw new EdgeFunctionError('Failed to get session', 401, sessionError);
  }

  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new EdgeFunctionError('No active session. Please sign in again.', 401);
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
      
      throw new EdgeFunctionError(
        `Edge function returned ${response.status}: ${response.statusText}`,
        response.status,
        errorDetails
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof EdgeFunctionError) {
      throw error;
    }
    
    throw new EdgeFunctionError(
      error instanceof Error ? error.message : 'Unknown error calling edge function',
      500,
      error
    );
  }
}
