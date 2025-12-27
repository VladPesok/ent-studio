/**
 * Central export for all database DAOs (Data Access Objects)
 * Import from here for easier access
 */

// Doctor DAO
export * from './doctorDao';

// Diagnosis DAO
export * from './diagnosisDao';

// Patient Status DAO
export * from './patientStatusDao';

// Patient DAO
export * from './patientDao';

// Appointment DAO
export * from './appointmentDao';

// Test DAO
export * from './testDao';

// Settings DAO
export * from './settingsDao';

// Session DAO
export * from './sessionDao';

// Tabs DAO
export * from './tabsDao';

// Storage Path DAO
export * from './storagePathDao';

// Import setup functions for IPC handlers
import { setupPatientIpcHandlers } from './patientDao';
import { setupAppointmentIpcHandlers } from './appointmentDao';
import { setupDictIpcHandlers } from './doctorDao';
import { setupSettingsIpcHandlers } from './settingsDao';
import { setupSessionIpcHandlers } from './sessionDao';
import { setupTabsIpcHandlers } from './tabsDao';
import { setupPatientTestIpcHandlers } from './testDao';
import { setupStoragePathIpcHandlers } from './storagePathDao';
import { setupPatientStatusIpcHandlers, initializeDefaultPatientStatuses } from './patientStatusDao';

/**
 * Setup all database IPC handlers
 * Call this after database initialization
 */
export function setupAllDatabaseIpcHandlers(): void {
  // Initialize default patient statuses before setting up handlers
  initializeDefaultPatientStatuses();
  
  setupPatientIpcHandlers();
  setupAppointmentIpcHandlers();
  setupDictIpcHandlers();
  setupSettingsIpcHandlers();
  setupSessionIpcHandlers();
  setupTabsIpcHandlers();
  setupPatientTestIpcHandlers();
  setupStoragePathIpcHandlers();
  setupPatientStatusIpcHandlers();
}
