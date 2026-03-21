/**
 * User Profile Service
 * Handles all API calls for user profile operations
 */

import apiClient from './axiosConfig';

// ============================================
// USER PROFILE API
// ============================================

export async function getCurrentUser(): Promise<any> {
  try {
    console.log('👤 [Frontend] Fetching current user profile');
    const response = await apiClient.get('/users/me');
    console.log('✅ [Frontend] Current user:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Frontend] Error fetching current user:', error);
    throw error;
  }
}

export async function updateProfile(data: {
  email?: string;
  profile_name?: string;
  avatar_url?: string;
}): Promise<any> {
  try {
    console.log('👤 [Frontend] Updating user profile');
    console.log('📋 [Frontend] Profile data:', data);
    const response = await apiClient.patch('/users/me', data);
    console.log('✅ [Frontend] Profile updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Frontend] Error updating profile:', error);
    throw error;
  }
}

export async function updatePreferences(data: {
  theme_preference?: string;
}): Promise<any> {
  try {
    console.log('⚙️ [Frontend] Updating user preferences');
    console.log('📋 [Frontend] Preferences data:', data);
    const response = await apiClient.patch('/users/me/preferences', data);
    console.log('✅ [Frontend] Preferences updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Frontend] Error updating preferences:', error);
    throw error;
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    console.log('🗑️ [Frontend] Deleting user account');
    const response = await apiClient.delete('/users/me');
    console.log('✅ [Frontend] Account deleted:', response.data);
  } catch (error) {
    console.error('❌ [Frontend] Error deleting account:', error);
    throw error;
  }
}
