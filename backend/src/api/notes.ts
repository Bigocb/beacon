import { Router, Response, Request } from 'express';
import { randomUUID } from 'crypto';
import notesDb, { initializeNotesDatabase } from '../db/sqliteNotes';
import { CreateNoteInput, UpdateNoteInput, NoteWithTags } from '../types/enrichment';

const router = Router();

// Initialize database on startup
initializeNotesDatabase();

// Temporary: Use a default user UUID for desktop app (will be replaced with Minecraft auth)
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// GET /saves/:saveId/notes - List notes for a save
// ============================================
router.get('/saves/:saveId/notes', (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('📝 [Backend] GET /api/saves/:saveId/notes');
    console.log('   saveId:', saveId);
    console.log('   userId:', userId);
    console.log('⚠️  [Backend] Note: Desktop saves are loaded locally, not synced to DB. Fetching notes directly by saveId...');

    // Get notes (no save ownership check needed for local saves)
    console.log('📚 [Backend] Fetching notes from database...');
    const notesResult = notesDb.query(
      `SELECT n.* FROM notes n
       WHERE n.save_id = ? AND n.deleted_at IS NULL
       ORDER BY n.timestamp DESC`,
      [saveId]
    );

    console.log('✅ [Backend] Found', notesResult.rows.length, 'notes');

    // For each note, fetch its tags
    const notes = notesResult.rows.map(note => {
      const tagsResult = notesDb.query(
        `SELECT t.* FROM tags t
         JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?`,
        [note.id]
      );
      return {
        ...note,
        tags: tagsResult.rows || [],
      };
    });

    console.log('📤 [Backend] Returning notes response');
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /notes/:noteId - Get single note
// ============================================
router.get('/notes/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('📝 [Backend] GET /api/notes/:noteId');
    console.log('   noteId:', noteId);
    console.log('   userId:', userId);

    // Fetch note (no ownership check needed for desktop app)
    console.log('🔍 [Backend] Fetching note...');
    const noteResult = notesDb.query(
      `SELECT n.* FROM notes n WHERE n.id = ? AND n.deleted_at IS NULL`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      console.log('❌ [Backend] Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('✅ [Backend] Note found:', noteResult.rows[0].id);

    // Get tags
    console.log('🏷️  [Backend] Fetching tags for note...');
    const tagsResult = notesDb.query(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?`,
      [noteId]
    );

    console.log('   Found', tagsResult.rows.length, 'tags');
    const note = {
      ...noteResult.rows[0],
      tags: tagsResult.rows,
    };

    console.log('📤 [Backend] Returning note response');
    res.json({ note });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /saves/:saveId/notes - Create note
// ============================================
router.post('/saves/:saveId/notes', (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const userId = DEFAULT_USER_UUID;
    const { title, content, note_type = 'general', timestamp, tag_ids = [] } = req.body as CreateNoteInput & { tag_ids?: string[] };

    console.log('📝 [Backend] POST /api/saves/:saveId/notes');
    console.log('   saveId:', saveId);
    console.log('   userId:', userId);
    console.log('   body:', { title, content: content?.substring(0, 50), note_type, timestamp, tag_ids });

    if (!content || !content.trim()) {
      console.log('❌ [Backend] Content is empty');
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('⚠️  [Backend] Note: Skipping save ownership check (local saves not synced to DB)');

    const noteId = randomUUID();
    const now = new Date().toISOString();

    // Create note and add tags in a transaction
    console.log('💾 [Backend] Inserting note into database...');
    notesDb.transaction(() => {
      notesDb.run(
        `INSERT INTO notes (id, save_id, title, content, note_type, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [noteId, saveId, title || null, content, note_type, timestamp || now, now, now]
      );
      console.log('✅ [Backend] Note inserted with id:', noteId);

      // Add tags
      if (tag_ids && tag_ids.length > 0) {
        for (const tagId of tag_ids) {
          notesDb.run(
            `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
            [noteId, tagId]
          );
        }
      }
    });

    // Get created note with tags
    const noteResult = notesDb.query(
      `SELECT * FROM notes WHERE id = ?`,
      [noteId]
    );

    const tagsResult = notesDb.query(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?`,
      [noteId]
    );

    res.status(201).json({
      note: {
        ...noteResult.rows[0],
        tags: tagsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PATCH /notes/:noteId - Update note
// ============================================
router.patch('/notes/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = DEFAULT_USER_UUID;
    const { title, content, note_type, timestamp, tag_ids } = req.body as UpdateNoteInput & { tag_ids?: string[] };

    console.log('✏️  [Backend] PATCH /api/notes/:noteId');
    console.log('   noteId:', noteId);
    console.log('   userId:', userId);
    console.log('   body:', { title, content: content?.substring(0, 50), note_type, timestamp, tag_ids });

    // Verify note exists (no ownership check needed for desktop app)
    console.log('🔍 [Backend] Verifying note exists...');
    const noteResult = notesDb.query(
      `SELECT n.* FROM notes n WHERE n.id = ? AND n.deleted_at IS NULL`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      console.log('❌ [Backend] Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('✅ [Backend] Note found');

    const now = new Date().toISOString();

    // Update note and tags in a transaction
    notesDb.transaction(() => {
      const updates: string[] = ['updated_at = ?'];
      const values: any[] = [now];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (content !== undefined) {
        updates.push('content = ?');
        values.push(content);
      }
      if (note_type !== undefined) {
        updates.push('note_type = ?');
        values.push(note_type);
      }
      if (timestamp !== undefined) {
        updates.push('timestamp = ?');
        values.push(timestamp);
      }

      values.push(noteId);

      if (updates.length > 1) {
        console.log('💾 [Backend] Updating note fields...');
        notesDb.run(
          `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        console.log('✅ [Backend] Note fields updated');
      }

      // Update tags
      if (tag_ids !== undefined) {
        console.log('🏷️  [Backend] Updating tags...');
        // Delete existing tags
        notesDb.run('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
        console.log('   Deleted existing tags');

        // Add new tags
        if (tag_ids.length > 0) {
          for (const tagId of tag_ids) {
            notesDb.run(
              `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
              [noteId, tagId]
            );
          }
          console.log('   Inserted', tag_ids.length, 'new tags');
        }
      }
    });

    // Get updated note
    console.log('📚 [Backend] Fetching updated note from database...');
    const updatedNote = notesDb.query(
      `SELECT * FROM notes WHERE id = ?`,
      [noteId]
    );

    console.log('🏷️  [Backend] Fetching updated tags...');
    const tagsResult = notesDb.query(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?`,
      [noteId]
    );

    console.log('   Found', tagsResult.rows.length, 'tags');
    console.log('📤 [Backend] Returning updated note response');
    res.json({
      note: {
        ...updatedNote.rows[0],
        tags: tagsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DELETE /notes/:noteId - Soft delete note
// ============================================
router.delete('/notes/:noteId', (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('🗑️  [Backend] DELETE /api/notes/:noteId');
    console.log('   noteId:', noteId);
    console.log('   userId:', userId);

    // Verify note exists (no ownership check needed for desktop app)
    console.log('🔍 [Backend] Verifying note exists...');
    const noteResult = notesDb.query(
      `SELECT n.* FROM notes n WHERE n.id = ? AND n.deleted_at IS NULL`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      console.log('❌ [Backend] Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('✅ [Backend] Note found, soft deleting...');

    // Soft delete
    const now = new Date().toISOString();
    notesDb.run(
      'UPDATE notes SET deleted_at = ? WHERE id = ?',
      [now, noteId]
    );

    console.log('✅ [Backend] Note soft deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /notes/:noteId/tags/:tagId - Add tag to note
// ============================================
router.post('/notes/:noteId/tags/:tagId', (req: Request, res: Response) => {
  try {
    const { noteId, tagId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('🏷️  [Backend] POST /api/notes/:noteId/tags/:tagId');
    console.log('   noteId:', noteId);
    console.log('   tagId:', tagId);
    console.log('   userId:', userId);

    // Verify note exists (no ownership check needed for desktop app)
    console.log('🔍 [Backend] Verifying note exists...');
    const noteResult = notesDb.query(
      `SELECT n.* FROM notes n WHERE n.id = ?`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      console.log('❌ [Backend] Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('✅ [Backend] Note found, adding tag...');

    // Insert tag relationship (SQLite will ignore if it already exists)
    try {
      notesDb.run(
        `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
        [noteId, tagId]
      );
    } catch (e) {
      // Ignore constraint violations (tag already exists)
    }

    console.log('✅ [Backend] Tag added to note');
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DELETE /notes/:noteId/tags/:tagId - Remove tag from note
// ============================================
router.delete('/notes/:noteId/tags/:tagId', (req: Request, res: Response) => {
  try {
    const { noteId, tagId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('🏷️  [Backend] DELETE /api/notes/:noteId/tags/:tagId');
    console.log('   noteId:', noteId);
    console.log('   tagId:', tagId);
    console.log('   userId:', userId);

    // Verify note exists (no ownership check needed for desktop app)
    console.log('🔍 [Backend] Verifying note exists...');
    const noteResult = notesDb.query(
      `SELECT n.* FROM notes n WHERE n.id = ?`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      console.log('❌ [Backend] Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('✅ [Backend] Note found, removing tag...');

    // Delete tag relationship
    notesDb.run(
      'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
      [noteId, tagId]
    );

    console.log('✅ [Backend] Tag removed from note');
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
