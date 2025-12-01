-- Create storage_paths table for managing multiple storage locations
CREATE TABLE IF NOT EXISTS `storage_paths` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `path` text NOT NULL UNIQUE,
  `is_active` integer NOT NULL DEFAULT 0,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);

