/**
 * Secure cryptographic utilities for edge functions
 * Addresses P1: OTP plaintext storage and timing attacks
 */

/**
 * Hash an OTP code using SHA-256
 * Salt with the identifier (phone/email) for uniqueness
 */
export async function hashOtp(otp: string, identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${identifier}:${otp}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * This is critical for password/OTP verification
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    // but we know result will be false
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let result = shorter.length ^ longer.length; // Will be non-zero

    for (let i = 0; i < longer.length; i++) {
      const charA = shorter.charCodeAt(i % shorter.length) || 0;
      const charB = longer.charCodeAt(i) || 0;
      result |= charA ^ charB;
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Constant-time byte array comparison
 */
export function constantTimeByteCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    // Still iterate to maintain constant time, but result will be false
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let result = shorter.length ^ longer.length;

    for (let i = 0; i < longer.length; i++) {
      const byteA = shorter[i % shorter.length] ?? 0;
      const byteB = longer[i] ?? 0;
      result |= byteA ^ byteB;
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Verify password using PBKDF2 with constant-time comparison
 * This fixes the timing attack vulnerability in verify-password
 */
export async function verifyPasswordSecure(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Decode the stored hash from base64
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);

    // Hash the provided password with the extracted salt
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(hashBuffer);

    // Use constant-time comparison to prevent timing attacks
    return constantTimeByteCompare(hashArray, storedHashBytes);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a cryptographically secure random OTP
 */
export function generateSecureOtp(length = 6): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Map to digits 0-9
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += (array[i] % 10).toString();
  }

  // Ensure first digit is not 0 for better UX
  if (otp[0] === '0') {
    otp = (1 + (array[0] % 9)).toString() + otp.slice(1);
  }

  return otp;
}

/**
 * Check if test mode is enabled (for test phone numbers)
 * Only returns true if explicitly enabled AND in non-production environment
 */
export function isTestModeEnabled(): boolean {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  const testModeFlag = Deno.env.get('ALLOW_TEST_PHONE_NUMBERS');

  // Test mode only allowed in development or staging
  if (env === 'production') {
    return false;
  }

  // Must be explicitly enabled
  return testModeFlag === 'true';
}

/**
 * Check if a phone number is a test number
 */
export function isTestPhoneNumber(phoneNumber: string): boolean {
  // Only allow test numbers if test mode is explicitly enabled
  if (!isTestModeEnabled()) {
    return false;
  }

  // Test patterns: +1555XXXXXXX, +11234567890, +10000000000
  const testPatterns = [
    /^\+1555\d{7}$/,
    /^\+1(1234567890|0{10})$/,
    /^\+9{11,}$/,
  ];

  return testPatterns.some(pattern => pattern.test(phoneNumber));
}
