-- Fix: Remove foreign key constraint from notes table
-- The desktop app stores saves locally, not in the database
-- So notes can have save_ids that don't exist in the saves table

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_save_id_fkey;
