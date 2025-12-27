/**
 * Secure CORS configuration for edge functions
 * Addresses P0: Edge Functions CORS * + no auth = abuse
 */

// Default allowed origins for production
const DEFAULT_ALLOWED_ORIGINS = [
  'https://viib.app',
  'https://www.viib.app',
  'https://app.viib.app',
];

// Lovable preview origins patterns
const LOVABLE_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/,
  /^https:\/\/lovable\.dev$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.dev$/,
];

// Development origins (only used when ENVIRONMENT=development)
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

/**
 * Get allowed origins based on environment and settings
 */
export function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  const customOrigins = Deno.env.get('ALLOWED_CORS_ORIGINS');

  let origins = [...DEFAULT_ALLOWED_ORIGINS];

  // Add custom origins from environment variable
  if (customOrigins) {
    const custom = customOrigins.split(',').map(o => o.trim()).filter(Boolean);
    origins = [...origins, ...custom];
  }

  // Only add development origins in non-production environments
  if (env === 'development' || env === 'staging') {
    origins = [...origins, ...DEV_ORIGINS];
  }

  return origins;
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Allow Lovable preview origins
  if (LOVABLE_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.some(allowed => {
    // Exact match
    if (allowed === origin) return true;
    // Wildcard subdomain match (e.g., *.viib.app)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
    }
    return false;
  });
}

/**
 * Get CORS headers for a request
 * Returns specific origin instead of * for security
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigin = isOriginAllowed(origin) ? origin : getAllowedOrigins()[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://viib.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(request) });
}

/**
 * Create a JSON response with proper CORS headers
 */
export function corsJsonResponse(
  data: unknown,
  request: Request,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(request),
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Check if request origin is valid, return error response if not
 */
export function validateOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');

  // Allow requests without origin (non-browser clients like mobile apps)
  if (!origin) return null;

  if (!isOriginAllowed(origin)) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return new Response(JSON.stringify({ error: 'Unauthorized origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}
