/**
 * Metadata API Service
 * Handles all GraphQL calls for world metadata
 */

import axios from 'axios';
import { WorldMetadataUI } from '../types/enrichment';

const API_BASE = 'http://localhost:3000';

// GraphQL helper
async function graphqlQuery(query: string, variables?: any, token?: string | null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.post(`${API_BASE}/graphql`, { query, variables }, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
}

// ============================================
// METADATA API
// ============================================

export async function fetchMetadata(saveId: string): Promise<WorldMetadataUI> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      query metadata($saveId: String!) {
        metadata(saveId: $saveId) {
          save_id
          description
          is_favorite
          theme_color
          world_type
          modpack_name
          modpack_version
          project_id
          archived_at
        }
      }
    `;
    console.log('🌍 [Frontend] Fetching metadata via GraphQL for save:', saveId);
    const result = await graphqlQuery(query, { saveId }, token);
    console.log('✅ [Frontend] Metadata response:', result);

    const metadata = result.metadata;
    if (!metadata) {
      return {
        description: '',
        is_favorite: false,
        theme_color: '#64748b',
        world_type: 'survival',
        modpack_name: '',
        modpack_version: '',
        project_id: undefined,
        archived: false,
      };
    }

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
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation createMetadata($saveId: String!, $data: CreateMetadataInput!) {
        createMetadata(saveId: $saveId, data: $data) {
          save_id
          description
          is_favorite
          theme_color
          world_type
          modpack_name
          modpack_version
          project_id
          archived_at
        }
      }
    `;

    const createData = {
      description: data.description || null,
      is_favorite: data.is_favorite || false,
      theme_color: data.theme_color || '#64748b',
      world_type: data.world_type || 'survival',
      modpack_name: data.modpack_name || null,
      modpack_version: data.modpack_version || null,
      project_id: data.project_id || null,
    };

    console.log('🌍 [Frontend] Creating metadata via GraphQL for save:', saveId);
    console.log('📋 [Frontend] Metadata payload:', createData);
    const result = await graphqlQuery(query, { saveId, data: createData }, token);
    console.log('✅ [Frontend] Create metadata response:', result);

    const metadata = result.createMetadata;
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
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation updateMetadata($saveId: String!, $data: UpdateMetadataInput!) {
        updateMetadata(saveId: $saveId, data: $data) {
          save_id
          description
          is_favorite
          theme_color
          world_type
          modpack_name
          modpack_version
          project_id
          archived_at
        }
      }
    `;

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description || undefined;
    if (data.is_favorite !== undefined) updateData.is_favorite = data.is_favorite;
    if (data.theme_color !== undefined) updateData.theme_color = data.theme_color || '#64748b';
    if (data.world_type !== undefined) updateData.world_type = data.world_type || 'survival';
    if (data.modpack_name !== undefined) updateData.modpack_name = data.modpack_name || undefined;
    if (data.modpack_version !== undefined) updateData.modpack_version = data.modpack_version || undefined;
    if (data.project_id !== undefined) updateData.project_id = data.project_id || undefined;

    console.log('🌍 [Frontend] Updating metadata via GraphQL for save:', saveId);
    console.log('📋 [Frontend] Update payload:', updateData);
    const result = await graphqlQuery(query, { saveId, data: updateData }, token);
    console.log('✅ [Frontend] Update metadata response:', result);

    const metadata = result.updateMetadata;
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
