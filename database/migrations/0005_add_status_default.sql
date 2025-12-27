-- Add is_default column to patient_statuses
ALTER TABLE patient_statuses ADD COLUMN is_default integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Set "Активний" (id=1) as the default status
UPDATE patient_statuses SET is_default = 1 WHERE id = 1;

