-- Add deleted_at column to patient_statuses table for soft delete
ALTER TABLE patient_statuses ADD COLUMN deleted_at text;

