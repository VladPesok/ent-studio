-- Add visibility columns to tabs table
ALTER TABLE `tabs` ADD `is_visible` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `tabs` ADD `is_default` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Mark default tabs
UPDATE `tabs` SET `is_default` = 1 WHERE `folder` IN ('video', 'audio', 'tests');

