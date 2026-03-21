// Token storage utilities for managing JWT authentication tokens
const TOKEN_KEY = 'minecraft_tracker_auth_token';

/**
 * Store authentication token in localStorage
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('💾 [TokenStorage] Auth token stored in localStorage');
  } catch (error) {
    console.error('❌ [TokenStorage] Failed to store token:', error);
  }
}

/**
 * Retrieve authentication token from localStorage
 */
export function getToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log('✓ [TokenStorage] Auth token retrieved from localStorage');
    }
    return token;
  } catch (error) {
    console.error('❌ [TokenStorage] Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Clear authentication token from localStorage
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log('🗑️  [TokenStorage] Auth token cleared from localStorage');
  } catch (error) {
    console.error('❌ [TokenStorage] Failed to clear token:', error);
  }
}

/**
 * Check if token exists
 */
export function hasToken(): boolean {
  return getToken() !== null;
}

/**
 * Validate JWT token format and expiration
 * Decodes JWT without verifying signature (signature verified by server)
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('⚠️  [TokenStorage] Invalid token format');
      return false;
    }

    // Decode payload (base64 URL decode)
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration (exp is in seconds, Date.now() is in milliseconds)
    if (payload.exp) {
      const expiresAt = payload.exp * 1000;
      const isExpired = Date.now() > expiresAt;

      if (isExpired) {
        console.log('⚠️  [TokenStorage] Token has expired');
        return false;
      }
    }

    console.log('✓ [TokenStorage] Token is valid');
    return true;
  } catch (error) {
    console.error('❌ [TokenStorage] Error validating token:', error);
    return false;
  }
}
