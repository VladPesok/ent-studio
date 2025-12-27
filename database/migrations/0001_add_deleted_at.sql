-- Add deleted_at column to doctors table for soft delete
ALTER TABLE `doctors` ADD `deleted_at` text;
--> statement-breakpoint
-- Add deleted_at column to diagnoses table for soft delete
ALTER TABLE `diagnoses` ADD `deleted_at` text;

