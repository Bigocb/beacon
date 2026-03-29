/**
 * Notes API Service
 * Handles all GraphQL calls for notes and tags
 */

import axios from 'axios';
import { NoteUI, TagUI, NoteType } from '../types/enrichment';

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
// TAGS API
// ============================================

export async function fetchTags(): Promise<TagUI[]> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      query {
        tags {
          id
          name
          color
          created_at
        }
      }
    `;
    console.log('🏷️ [Frontend] Fetching tags via GraphQL');
    const result = await graphqlQuery(query, undefined, token);
    console.log('✅ [Frontend] Tags response:', result);
    return result.tags || [];
  } catch (error) {
    console.error('❌ [Frontend] Error fetching tags:', error);
    throw error;
  }
}

export async function createTag(name: string, color?: string): Promise<TagUI> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation createTag($name: String!, $color: String) {
        createTag(name: $name, color: $color) {
          id
          name
          color
          created_at
        }
      }
    `;
    const result = await graphqlQuery(query, { name, color }, token);
    console.log('✅ [Frontend] Created tag:', result);
    return result.createTag;
  } catch (error) {
    console.error('❌ [Frontend] Error creating tag:', error);
    throw error;
  }
}

export async function updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<TagUI> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation updateTag($id: String!, $name: String, $color: String) {
        updateTag(id: $id, name: $name, color: $color) {
          id
          name
          color
          created_at
        }
      }
    `;
    const result = await graphqlQuery(query, { id: tagId, ...updates }, token);
    return result.updateTag;
  } catch (error) {
    console.error('❌ [Frontend] Error updating tag:', error);
    throw error;
  }
}

export async function deleteTag(tagId: string): Promise<void> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation deleteTag($id: String!) {
        deleteTag(id: $id)
      }
    `;
    await graphqlQuery(query, { id: tagId }, token);
    console.log('✅ [Frontend] Deleted tag:', tagId);
  } catch (error) {
    console.error('❌ [Frontend] Error deleting tag:', error);
    throw error;
  }
}

// ============================================
// NOTES API
// ============================================

export async function fetchNotes(saveId: string, playerUUID?: string): Promise<NoteUI[]> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      query notes($saveId: String!) {
        notes(saveId: $saveId) {
          id
          save_id
          title
          content
          note_type
          timestamp
          created_at
          updated_at
          tags {
            id
            name
            color
          }
        }
      }
    `;
    console.log('📝 [Frontend] Fetching notes via GraphQL for save:', saveId);
    const result = await graphqlQuery(query, { saveId }, token);
    console.log('✅ [Frontend] Notes response:', result);

    const notes = (result.notes || []).map((note: any) => ({
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
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      query note($id: String!) {
        note(id: $id) {
          id
          save_id
          title
          content
          note_type
          timestamp
          created_at
          updated_at
          tags {
            id
            name
            color
          }
        }
      }
    `;
    const result = await graphqlQuery(query, { id: noteId }, token);
    const note = result.note;

    return {
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      deleted_at: note.deleted_at ? new Date(note.deleted_at) : undefined,
      tags: note.tags || [],
    };
  } catch (error) {
    console.error('❌ [Frontend] Error fetching note:', error);
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
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation createNote($saveId: String!, $data: CreateNoteInput!) {
        createNote(saveId: $saveId, data: $data) {
          id
          save_id
          title
          content
          note_type
          timestamp
          created_at
          updated_at
          tags {
            id
            name
            color
          }
        }
      }
    `;

    const variables = {
      saveId,
      data: {
        title: data.title,
        content: data.content,
        note_type: data.note_type,
        timestamp: data.timestamp.toISOString(),
        tag_ids: data.tag_ids || [],
      },
    };

    console.log('📝 [Frontend] Creating note via GraphQL');
    console.log('📋 [Frontend] Note data:', variables);
    const result = await graphqlQuery(query, variables, token);
    console.log('✅ [Frontend] Create note response:', result);

    const note = result.createNote;
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
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation updateNote($id: String!, $data: UpdateNoteInput!) {
        updateNote(id: $id, data: $data) {
          id
          save_id
          title
          content
          note_type
          timestamp
          created_at
          updated_at
          tags {
            id
            name
            color
          }
        }
      }
    `;

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title || undefined;
    if (data.content !== undefined) updateData.content = data.content || undefined;
    if (data.note_type !== undefined) updateData.note_type = data.note_type || undefined;
    if (data.timestamp !== undefined) updateData.timestamp = data.timestamp?.toISOString();
    if (data.tag_ids !== undefined) updateData.tag_ids = data.tag_ids;

    const result = await graphqlQuery(query, { id: noteId, data: updateData }, token);
    const note = result.updateNote;

    return {
      ...note,
      timestamp: new Date(note.timestamp),
      created_at: new Date(note.created_at),
      updated_at: new Date(note.updated_at),
      tags: note.tags || [],
    };
  } catch (error) {
    console.error('❌ [Frontend] Error updating note:', error);
    throw error;
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation deleteNote($id: String!) {
        deleteNote(id: $id)
      }
    `;
    await graphqlQuery(query, { id: noteId }, token);
    console.log('✅ [Frontend] Deleted note:', noteId);
  } catch (error) {
    console.error('❌ [Frontend] Error deleting note:', error);
    throw error;
  }
}

export async function addNoteTag(noteId: string, tagId: string): Promise<void> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation addNoteTag($noteId: String!, $tagId: String!) {
        addNoteTag(noteId: $noteId, tagId: $tagId)
      }
    `;
    await graphqlQuery(query, { noteId, tagId }, token);
    console.log('✅ [Frontend] Added tag to note');
  } catch (error) {
    console.error('❌ [Frontend] Error adding tag to note:', error);
    throw error;
  }
}

export async function removeNoteTag(noteId: string, tagId: string): Promise<void> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation removeNoteTag($noteId: String!, $tagId: String!) {
        removeNoteTag(noteId: $noteId, tagId: $tagId)
      }
    `;
    await graphqlQuery(query, { noteId, tagId }, token);
    console.log('✅ [Frontend] Removed tag from note');
  } catch (error) {
    console.error('❌ [Frontend] Error removing tag from note:', error);
    throw error;
  }
}
