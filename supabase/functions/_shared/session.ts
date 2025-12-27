/**
 * Session Token Management
 * Creates cryptographically signed session tokens (JWT-like)
 * to replace insecure localStorage userId approach
 */

// Secret key for signing tokens - MUST be set in environment
const getSecretKey = async (): Promise<CryptoKey> => {
  const secret = Deno.env.get('SESSION_SECRET');
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

/**
 * Base64url encode (URL-safe base64)
 */
function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64url decode
 */
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export interface SessionPayload {
  sub: string; // user ID
  email?: string;
  phone?: string;
  iat: number; // issued at
  exp: number; // expiration
  type: 'session';
}

/**
 * Create a signed session token
 */
export async function createSessionToken(
  userId: string,
  options: {
    email?: string;
    phone?: string;
    expiresIn?: number; // seconds, default 24 hours
    rememberMe?: boolean;
  } = {}
): Promise<string> {
  const key = await getSecretKey();
  const encoder = new TextEncoder();

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.rememberMe
    ? 30 * 24 * 60 * 60 // 30 days
    : (options.expiresIn || 24 * 60 * 60); // 24 hours

  const payload: SessionPayload = {
    sub: userId,
    email: options.email,
    phone: options.phone,
    iat: now,
    exp: now + expiresIn,
    type: 'session',
  };

  // Create header
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));

  // Create signature
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );
  const signatureB64 = base64urlEncode(new Uint8Array(signatureBuffer));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const key = await getSecretKey();
    const encoder = new TextEncoder();

    // Verify signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = base64urlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signatureInput)
    );

    if (!isValid) {
      return null;
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    // Verify payload structure
    if (payload.type !== 'session' || !payload.sub) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract session token from Authorization header
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Middleware to validate session and get user
 */
export async function validateSession(
  request: Request
): Promise<{ valid: false; error: string } | { valid: true; payload: SessionPayload }> {
  const token = extractTokenFromRequest(request);

  if (!token) {
    return { valid: false, error: 'No session token provided' };
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return { valid: false, error: 'Invalid or expired session' };
  }

  return { valid: true, payload };
}
