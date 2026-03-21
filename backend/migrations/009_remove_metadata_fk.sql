-- Fix: Remove foreign key constraint from world_metadata table
-- The desktop app stores saves locally, not in the database
-- So world_metadata can have save_ids that don't exist in the saves table

ALTER TABLE world_metadata
DROP CONSTRAINT IF EXISTS world_metadata_save_id_fkey;
