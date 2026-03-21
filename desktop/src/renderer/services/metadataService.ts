/**
 * Metadata API Service
 * Handles all API calls for world metadata
 */

import axios from 'axios';
import { WorldMetadataUI } from '../types/enrichment';

const API_BASE = 'http://localhost:3000/api';

// ============================================
// METADATA API
// ============================================

export async function fetchMetadata(saveId: string): Promise<WorldMetadataUI> {
  try {
    const url = `${API_BASE}/saves/${saveId}/metadata`;
    console.log('🌍 [Frontend] Fetching metadata from:', url);
    const response = await axios.get(url);
    console.log('✅ [Frontend] Metadata response:', response.data);

    const metadata = response.data.metadata;
    return {
      description: metadata.description || '',
      is_favorite: metadata.is_favorite || false,
      theme_color: metadata.theme_color || '#64748b',
      world_type: metadata.world_type || 'survival',
      modpack_name: metadata.modpack_name || '',
      modpack_version: metadata.modpack_version || '',
      project_id: metadata.project_id || null,
      archived: !!metadata.archived_at,
    };
  } catch (error) {
    console.error('❌ [Frontend] Error fetching metadata:', error);
    throw error;
  }
}

export async function createMetadata(
  saveId: string,
  data: {
    description?: string;
    is_favorite?: boolean;
    theme_color?: string;
    world_type: string;
    modpack_name?: string;
    modpack_version?: string;
    project_id?: string;
  }
): Promise<WorldMetadataUI> {
  try {
    const payload = {
      description: data.description || null,
      is_favorite: data.is_favorite || false,
      theme_color: data.theme_color || '#64748b',
      world_type: data.world_type || 'survival',
      modpack_name: data.modpack_name || null,
      modpack_version: data.modpack_version || null,
      project_id: data.project_id || null,
    };

    const url = `${API_BASE}/saves/${saveId}/metadata`;
    console.log('🌍 [Frontend] Creating metadata at:', url);
    console.log('📋 [Frontend] Metadata payload:', payload);
    const response = await axios.post(url, payload);
    console.log('✅ [Frontend] Create metadata response:', response.data);

    const metadata = response.data.metadata;
    return {
      description: metadata.description || '',
      is_favorite: metadata.is_favorite || false,
      theme_color: metadata.theme_color || '#64748b',
      world_type: metadata.world_type || 'survival',
      modpack_name: metadata.modpack_name || '',
      modpack_version: metadata.modpack_version || '',
      project_id: metadata.project_id || null,
      archived: !!metadata.archived_at,
    };
  } catch (error) {
    console.error('❌ [Frontend] Error creating metadata:', error);
    throw error;
  }
}

export async function updateMetadata(
  saveId: string,
  data: {
    description?: string;
    is_favorite?: boolean;
    theme_color?: string;
    world_type?: string;
    modpack_name?: string;
    modpack_version?: string;
    project_id?: string;
  }
): Promise<WorldMetadataUI> {
  try {
    const payload: any = {};
    if (data.description !== undefined) payload.description = data.description || null;
    if (data.is_favorite !== undefined) payload.is_favorite = data.is_favorite;
    if (data.theme_color !== undefined) payload.theme_color = data.theme_color || '#64748b';
    if (data.world_type !== undefined) payload.world_type = data.world_type || 'survival';
    if (data.modpack_name !== undefined) payload.modpack_name = data.modpack_name || null;
    if (data.modpack_version !== undefined) payload.modpack_version = data.modpack_version || null;
    if (data.project_id !== undefined) payload.project_id = data.project_id || null;

    const url = `${API_BASE}/saves/${saveId}/metadata`;
    console.log('🌍 [Frontend] Updating metadata at:', url);
    console.log('📋 [Frontend] Update payload:', payload);
    const response = await axios.patch(url, payload);
    console.log('✅ [Frontend] Update metadata response:', response.data);

    const metadata = response.data.metadata;
    return {
      description: metadata.description || '',
      is_favorite: metadata.is_favorite || false,
      theme_color: metadata.theme_color || '#64748b',
      world_type: metadata.world_type || 'survival',
      modpack_name: metadata.modpack_name || '',
      modpack_version: metadata.modpack_version || '',
      project_id: metadata.project_id || null,
      archived: !!metadata.archived_at,
    };
  } catch (error) {
    console.error('❌ [Frontend] Error updating metadata:', error);
    throw error;
  }
}
