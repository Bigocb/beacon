-- Fix: Remove foreign key constraint from world_metadata table
-- The desktop app stores saves locally, not in the database
-- So world_metadata can have save_ids that don't exist in the saves table
--
-- SQLite: Foreign keys are defined at table creation time and can't be dropped
-- This is a PostgreSQL-style migration that doesn't apply to SQLite
-- The world_metadata table was created without the FK constraint, so no action needed

SELECT 1; -- No-op for SQLite
