/**
 * Supabase Auth JWT Validation for Edge Functions
 * All protected Edge Functions MUST validate JWT before processing
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AuthResult {
  authenticated: boolean;
  user?: User;
  userId?: string;
  error?: string;
}

/**
 * Create Supabase client with user's JWT for RLS
 */
export function createAuthenticatedClient(authHeader: string | null): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create Supabase admin client (for service operations)
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validate Supabase Auth JWT from request
 * Returns authenticated user info or error
 */
export async function validateAuthJWT(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header',
    };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token || token === authHeader) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format',
    };
  }

  try {
    // Create client with the user's JWT
    const supabase = createAuthenticatedClient(authHeader);

    // Verify the JWT by getting the user
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authenticated: false,
        error: error?.message || 'Invalid or expired token',
      };
    }

    // Get the internal user ID from users table
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    return {
      authenticated: true,
      user,
      userId: userData?.id || undefined, // Internal user ID from users table
    };
  } catch (err) {
    return {
      authenticated: false,
      error: 'Token validation failed',
    };
  }
}

/**
 * Require valid authentication or return 401 response
 * Use this as guard at start of protected Edge Functions
 */
export async function requireAuth(request: Request): Promise<
  { authenticated: true; user: User; userId?: string } |
  { authenticated: false; response: Response }
> {
  const result = await validateAuthJWT(request);

  if (!result.authenticated) {
    return {
      authenticated: false,
      response: new Response(
        JSON.stringify({ error: result.error || 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return {
    authenticated: true,
    user: result.user!,
    userId: result.userId,
  };
}

/**
 * Verify HMAC signature for server-to-server calls
 * Used by admin/cron Edge Functions
 */
export async function verifyHmacSignature(
  request: Request,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('X-Signature');
  const timestamp = request.headers.get('X-Timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const requestTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - requestTime) > 300) {
    return false;
  }

  const secret = Deno.env.get('EDGE_FUNCTION_SECRET');
  if (!secret) {
    console.error('EDGE_FUNCTION_SECRET not configured');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureInput = `${timestamp}.${body}`;
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signatureInput)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Require either valid JWT auth OR valid HMAC signature
 * Use for endpoints that can be called by users or server
 */
export async function requireAuthOrHmac(
  request: Request,
  body: string
): Promise<
  { authenticated: true; user?: User; userId?: string; isServerCall: boolean } |
  { authenticated: false; response: Response }
> {
  // First try JWT auth
  const jwtResult = await validateAuthJWT(request);
  if (jwtResult.authenticated) {
    return {
      authenticated: true,
      user: jwtResult.user,
      userId: jwtResult.userId,
      isServerCall: false,
    };
  }

  // Then try HMAC signature
  const hmacValid = await verifyHmacSignature(request, body);
  if (hmacValid) {
    return {
      authenticated: true,
      isServerCall: true,
    };
  }

  return {
    authenticated: false,
    response: new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ),
  };
}

/**
 * Require valid HMAC signature (server-to-server only)
 * Use for admin/cron endpoints that should never be called by users
 */
export async function requireHmacAuth(
  request: Request,
  body: string
): Promise<
  { authenticated: true } |
  { authenticated: false; response: Response }
> {
  const hmacValid = await verifyHmacSignature(request, body);

  if (!hmacValid) {
    return {
      authenticated: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { authenticated: true };
}
