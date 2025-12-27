CREATE TABLE IF NOT EXISTS `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`appointment_date` text NOT NULL,
	`diagnosis_id` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`diagnosis_id`) REFERENCES `diagnoses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_patient_id` ON `appointments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_date` ON `appointments` (`appointment_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_patient_appointment` ON `appointments` (`patient_id`,`appointment_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `appointment_doctors` (
	`appointment_id` integer NOT NULL,
	`doctor_id` integer NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pk_appointment_doctors` ON `appointment_doctors` (`appointment_id`,`doctor_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `diagnoses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diagnoses_name_unique` ON `diagnoses` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `doctors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doctors_name_unique` ON `doctors` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`surname` text NOT NULL,
	`name` text NOT NULL,
	`birthdate` text NOT NULL,
	`folder_path` text NOT NULL,
	`patient_card_path` text,
	`primary_doctor_id` integer,
	`primary_diagnosis_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`primary_doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`primary_diagnosis_id`) REFERENCES `diagnoses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patients_folder_path_unique` ON `patients` (`folder_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_patients_folder_path` ON `patients` (`folder_path`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `patient_tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`appointment_id` integer,
	`test_template_id` integer NOT NULL,
	`test_name` text NOT NULL,
	`test_type` text NOT NULL,
	`test_data` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_template_id`) REFERENCES `test_templates`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_patient_tests_patient_id` ON `patient_tests` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_patient_tests_appointment_id` ON `patient_tests` (`appointment_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session_data` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tabs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`folder` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tabs_folder_unique` ON `tabs` (`folder`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `test_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`test_type` text NOT NULL,
	`description` text,
	`template_data` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
