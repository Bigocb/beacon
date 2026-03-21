/**
 * Token Storage - Renderer process token management
 * Handles JWT token persistence in localStorage
 */

/**
 * Store JWT token in localStorage
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem('minecraft_tracker_auth_token', token);
    console.log('💾 JWT token stored in localStorage');
  } catch (error) {
    console.error('❌ Error storing token:', error);
  }
}

/**
 * Retrieve JWT token from localStorage
 */
export function getToken(): string | null {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    if (token) {
      console.log('🔑 JWT token retrieved from localStorage');
    }
    return token;
  } catch (error) {
    console.error('❌ Error retrieving token:', error);
    return null;
  }
}

/**
 * Clear JWT token from localStorage
 */
export function clearToken(): void {
  try {
    localStorage.removeItem('minecraft_tracker_auth_token');
    console.log('🗑️ JWT token cleared from localStorage');
  } catch (error) {
    console.error('❌ Error clearing token:', error);
  }
}

/**
 * Check if token is valid (basic check)
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) {
    console.log('⚠️ No token found');
    return false;
  }

  try {
    // Decode JWT (without verification, just to check expiration)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('⚠️ Invalid token format');
      return false;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const expiresAt = new Date(payload.exp * 1000);

    if (expiresAt < new Date()) {
      console.log('⚠️ Token expired');
      return false;
    }

    console.log('✅ Token is valid, expires at:', expiresAt);
    return true;
  } catch (error) {
    console.error('❌ Error validating token:', error);
    return false;
  }
}
