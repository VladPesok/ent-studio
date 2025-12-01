-- Create patient_statuses table
CREATE TABLE IF NOT EXISTS `patient_statuses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `is_system` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `patient_statuses_name_unique` ON `patient_statuses` (`name`);
--> statement-breakpoint
INSERT OR IGNORE INTO `patient_statuses` (`id`, `name`, `is_system`) VALUES (1, 'Активний', 1);
--> statement-breakpoint
INSERT OR IGNORE INTO `patient_statuses` (`id`, `name`, `is_system`) VALUES (2, 'Архівований', 1);
--> statement-breakpoint
-- Add column without REFERENCES constraint (SQLite limitation)
ALTER TABLE `patients` ADD `status_id` integer DEFAULT 1;
--> statement-breakpoint
-- Set all existing patients to Active status
UPDATE `patients` SET `status_id` = 1 WHERE `status_id` IS NULL;

