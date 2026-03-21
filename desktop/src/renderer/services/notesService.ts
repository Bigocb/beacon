/**
 * Notes API Service
 * Handles all API calls for notes and tags
 */

import axios from 'axios';
import { NoteUI, TagUI, NoteType } from '../types/enrichment';

const API_BASE = 'http://localhost:3000/api';

// ============================================
// TAGS API
// ============================================

export async function fetchTags(): Promise<TagUI[]> {
  try {
    const url = `${API_BASE}/tags`;
    console.log('🏷️ [Frontend] Fetching tags from:', url);
    const response = await axios.get(url);
    console.log('✅ [Frontend] Tags response:', response.data);
    return response.data.tags || [];
  } catch (error) {
    console.error('❌ [Frontend] Error fetching tags:', error);
    throw error;
  }
}

export async function createTag(name: string, color?: string): Promise<TagUI> {
  try {
    const response = await axios.post(`${API_BASE}/tags`, { name, color });
    return response.data.tag;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

export async function updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<TagUI> {
  try {
    const response = await axios.patch(`${API_BASE}/tags/${tagId}`, updates);
    return response.data.tag;
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

export async function deleteTag(tagId: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/tags/${tagId}`);
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}

// ============================================
// NOTES API
// ============================================

export async function fetchNotes(saveId: string, playerUUID?: string): Promise<NoteUI[]> {
  try {
    let url = `${API_BASE}/saves/${saveId}/notes`;
    if (playerUUID) {
      url += `?player_uuid=${encodeURIComponent(playerUUID)}`;
    }
    console.log('📝 [Frontend] Fetching notes from:', url);
    const response = await axios.get(url);
    console.log('✅ [Frontend] Notes response:', response.data);
    const notes = (response.data.notes || []).map((note: any) => ({
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      deleted_at: note.deleted_at ? new Date(note.deleted_at) : undefined,
      tags: note.tags || [],
    }));
    console.log('✅ [Frontend] Parsed notes:', notes);
    return notes;
  } catch (error) {
    console.error('❌ [Frontend] Error fetching notes:', error);
    throw error;
  }
}

export async function fetchNote(noteId: string): Promise<NoteUI> {
  try {
    const response = await axios.get(`${API_BASE}/notes/${noteId}`);
    const note = response.data.note;
    return {
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      deleted_at: note.deleted_at ? new Date(note.deleted_at) : undefined,
      tags: note.tags || [],
    };
  } catch (error) {
    console.error('Error fetching note:', error);
    throw error;
  }
}

export async function createNote(
  saveId: string,
  data: {
    title?: string;
    content: string;
    note_type?: NoteType;
    timestamp: Date;
    tag_ids?: string[];
  },
  playerUUID?: string
): Promise<NoteUI> {
  try {
    const payload: any = {
      ...data,
      timestamp: data.timestamp.toISOString(),
      tag_ids: data.tag_ids || [],
    };

    if (playerUUID) {
      payload.player_uuid = playerUUID;
    }

    const url = `${API_BASE}/saves/${saveId}/notes`;
    console.log('📝 [Frontend] Creating note at:', url);
    console.log('📋 [Frontend] Note payload:', payload);
    const response = await axios.post(url, payload);
    console.log('✅ [Frontend] Create note response:', response.data);
    const note = response.data.note;

    return {
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      tags: note.tags || [],
    };
  } catch (error) {
    console.error('❌ [Frontend] Error creating note:', error);
    throw error;
  }
}

export async function updateNote(
  noteId: string,
  data: {
    title?: string;
    content?: string;
    note_type?: NoteType;
    timestamp?: Date;
    tag_ids?: string[];
  }
): Promise<NoteUI> {
  try {
    const payload: any = { ...data };
    if (data.timestamp) {
      payload.timestamp = data.timestamp.toISOString();
    }

    const response = await axios.patch(`${API_BASE}/notes/${noteId}`, payload);
    const note = response.data.note;

    return {
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      tags: note.tags || [],
    };
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/notes/${noteId}`);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

export async function addNoteTag(noteId: string, tagId: string): Promise<void> {
  try {
    await axios.post(`${API_BASE}/notes/${noteId}/tags/${tagId}`);
  } catch (error) {
    console.error('Error adding tag to note:', error);
    throw error;
  }
}

export async function removeNoteTag(noteId: string, tagId: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/notes/${noteId}/tags/${tagId}`);
  } catch (error) {
    console.error('Error removing tag from note:', error);
    throw error;
  }
}
