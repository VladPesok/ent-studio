import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { getRawDb } from './connection';
import {
  createDoctor,
  createDiagnosis,
  getDoctorByName,
  getDiagnosisByName,
  createPatient,
  updateAppointmentData,
  createPatientTest,
  setSetting,
  updateTabs,
  getAllPatientRoots,
  getDefaultPatientsRoot,
} from './dao';

interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
}

interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    doctors: number;
    diagnoses: number;
    patients: number;
    appointments: number;
    tests: number;
  };
  errors: string[];
}

/**
 * Check if migration is needed
 */
export const needsMigration = async (): Promise<boolean> => {
  const db = getRawDb();
  
  // Check if we have any patients in the database
  const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
  
  if (patientCount.count > 0) {
    return false; // Already migrated
  }
  
  // Check if old config files exist
  const appDataFolder = path.join(app.getPath("userData"), "appData");
  const settingsRoot = path.join(appDataFolder, "settings");
  const appConfigPath = path.join(settingsRoot, "app.config");
  
  try {
    await fs.access(appConfigPath);
    return true; // Old config exists, needs migration
  } catch {
    // No app.config, but check if there are patient folders with old config files
    const allPatientRoots = getAllPatientRoots();
    
    for (const patientsRoot of allPatientRoots) {
      try {
        const dirs = await fs.readdir(patientsRoot, { withFileTypes: true });
        for (const dir of dirs.filter(d => d.isDirectory())) {
          const patientConfigPath = path.join(patientsRoot, dir.name, 'patient.config');
          try {
            await fs.access(patientConfigPath);
            return true; // Found old patient config, needs migration
          } catch {
            // No config for this patient
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
    
    return false; // Fresh install
  }
};

/**
 * Create backup of existing data
 */
export const createBackup = async (): Promise<string> => {
  const appDataFolder = path.join(app.getPath("userData"), "appData");
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(app.getPath("userData"), `backup_${timestamp}`);
  
  console.log('Creating backup at:', backupFolder);
  
  await fs.cp(appDataFolder, backupFolder, { recursive: true });
  
  console.log('Backup created successfully');
  return backupFolder;
};

/**
 * Main migration function
 */
export const runMigration = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    message: '',
    stats: {
      doctors: 0,
      diagnoses: 0,
      patients: 0,
      appointments: 0,
      tests: 0,
    },
    errors: [],
  };

  try {
    const appDataFolder = path.join(app.getPath("userData"), "appData");
    const settingsRoot = path.join(appDataFolder, "settings");
    const appConfigPath = path.join(settingsRoot, "app.config");
    
    // Get all patient storage locations
    const allPatientRoots = getAllPatientRoots();
    console.log('Scanning patient roots:', allPatientRoots);

    // Step 1: Migrate app config
    onProgress?.({ step: 'Migrating settings', current: 1, total: 5, percentage: 20 });
    await migrateAppConfig(appConfigPath, result);

    // Step 2: Migrate patients from all storage locations
    onProgress?.({ step: 'Migrating patients', current: 2, total: 5, percentage: 40 });
    for (const patientsRoot of allPatientRoots) {
      await migratePatients(patientsRoot, result);
    }

    // Step 3: Migrate appointments from all storage locations
    onProgress?.({ step: 'Migrating appointments', current: 3, total: 5, percentage: 60 });
    for (const patientsRoot of allPatientRoots) {
      await migrateAppointments(patientsRoot, result);
    }

    // Step 4: Migrate tests from all storage locations
    onProgress?.({ step: 'Migrating tests', current: 4, total: 5, percentage: 80 });
    for (const patientsRoot of allPatientRoots) {
      await migrateTests(patientsRoot, result);
    }

    // Step 5: Finalize
    onProgress?.({ step: 'Finalizing migration', current: 5, total: 5, percentage: 100 });

    result.success = true;
    result.message = 'Migration completed successfully';
    
    console.log('Migration completed:', result);
    
  } catch (error) {
    console.error('Migration failed:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(result.message);
  }

  return result;
};

/**
 * Migrate app.config file
 */
const migrateAppConfig = async (configPath: string, result: MigrationResult): Promise<void> => {
  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Migrate doctors
    if (config.dictionaries?.doctors) {
      for (const doctor of config.dictionaries.doctors) {
        createDoctor(doctor);
        result.stats.doctors++;
      }
    }

    if (config.dictionaries?.diagnosis) {
      for (const diagnosis of config.dictionaries.diagnosis) {
        createDiagnosis(diagnosis);
        result.stats.diagnoses++;
      }
    }

    if (config.settings) {
      if (config.settings.theme) setSetting('theme', config.settings.theme);
      if (config.settings.locale) setSetting('locale', config.settings.locale);
      if (config.settings.praatPath) setSetting('praatPath', config.settings.praatPath);
      if (config.settings.defaultPatientCard !== undefined) {
        setSetting('defaultPatientCard', config.settings.defaultPatientCard);
      }
    }

    if (config.shownTabs && Array.isArray(config.shownTabs)) {
      updateTabs(config.shownTabs);
    }

    console.log('App config migrated successfully');
  } catch (error) {
    console.error('Error migrating app config:', error);
    result.errors.push(`App config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const migratePatients = async (patientsRoot: string, result: MigrationResult): Promise<void> => {
  try {
    // Check if directory exists
    try {
      await fs.access(patientsRoot);
    } catch {
      console.log(`Patients root doesn't exist, skipping: ${patientsRoot}`);
      return;
    }
    
    console.log(`Scanning patients in: ${patientsRoot}`);
    const dirs = await fs.readdir(patientsRoot, { withFileTypes: true });
    const patientFolders = dirs.filter(d => d.isDirectory());

    for (const folder of patientFolders) {
      try {
        const folderPath = folder.name;
        const [surname = '', name = '', dob = ''] = folderPath.split('_');

        // Read patient.config if it exists
        const patientConfigPath = path.join(patientsRoot, folderPath, 'patient.config');
        let patientConfig: any = { doctor: '', diagnosis: '', patientCard: '' };
        
        try {
          const configContent = await fs.readFile(patientConfigPath, 'utf8');
          patientConfig = { ...patientConfig, ...JSON.parse(configContent) };
        } catch {
          // Config doesn't exist or is invalid, use defaults
        }

        // Get latest appointment date
        const fullPatientPath = path.join(patientsRoot, folderPath);
        const appointmentFolders = await fs.readdir(fullPatientPath, { withFileTypes: true });
        const dates = appointmentFolders
          .filter(d => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
          .map(d => d.name)
          .sort();
        const latestDate = dates[dates.length - 1] || '';

        // Create patient using repository
        createPatient(folderPath, latestDate, {
          name: `${surname} ${name}`.trim(),
          birthdate: dob,
          doctor: patientConfig.doctor || '',
          diagnosis: patientConfig.diagnosis || '',
          patientCard: patientConfig.patientCard || undefined,
        });

        result.stats.patients++;
      } catch (error) {
        console.error(`Error migrating patient ${folder.name}:`, error);
        result.errors.push(`Patient ${folder.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Migrated ${result.stats.patients} patients from ${patientsRoot}`);
  } catch (error) {
    console.error('Error migrating patients:', error);
    result.errors.push(`Patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Migrate appointments from folder structure
 */
const migrateAppointments = async (patientsRoot: string, result: MigrationResult): Promise<void> => {
  try {
    // Check if directory exists
    try {
      await fs.access(patientsRoot);
    } catch {
      return; // Skip if doesn't exist
    }
    
    const patientFolders = await fs.readdir(patientsRoot, { withFileTypes: true });

    for (const patientFolder of patientFolders.filter(d => d.isDirectory())) {
      try {
        const folderPath = patientFolder.name;
        const patientPath = path.join(patientsRoot, folderPath);
        const appointmentFolders = await fs.readdir(patientPath, { withFileTypes: true });

        for (const appointmentFolder of appointmentFolders.filter(d => d.isDirectory())) {
          try {
            const appointmentDate = appointmentFolder.name;
            
            // Skip if not a date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) continue;

            // Read appointment.config if it exists
            const appointmentConfigPath = path.join(patientPath, appointmentDate, 'appointment.config');
            let appointmentConfig: any = { doctors: [], diagnosis: '', notes: '' };
            
            try {
              const configContent = await fs.readFile(appointmentConfigPath, 'utf8');
              appointmentConfig = { ...appointmentConfig, ...JSON.parse(configContent) };
            } catch {
              // Config doesn't exist or is invalid, use defaults
            }

            // Update appointment using repository
            updateAppointmentData(folderPath, appointmentDate, {
              doctors: Array.isArray(appointmentConfig.doctors) ? appointmentConfig.doctors : [],
              diagnosis: appointmentConfig.diagnosis || '',
              notes: appointmentConfig.notes || '',
            });

            result.stats.appointments++;
          } catch (error) {
            console.error(`Error migrating appointment ${appointmentFolder.name}:`, error);
            result.errors.push(`Appointment ${patientFolder.name}/${appointmentFolder.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error(`Error processing patient folder ${patientFolder.name}:`, error);
      }
    }

    console.log(`Migrated ${result.stats.appointments} appointments`);
  } catch (error) {
    console.error('Error migrating appointments:', error);
    result.errors.push(`Appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Migrate test results from JSON files
 */
const migrateTests = async (patientsRoot: string, result: MigrationResult): Promise<void> => {
  const db = getRawDb();
  
  try {
    // Check if directory exists
    try {
      await fs.access(patientsRoot);
    } catch {
      return; // Skip if doesn't exist
    }
    
    const patientFolders = await fs.readdir(patientsRoot, { withFileTypes: true });

    for (const patientFolder of patientFolders.filter(d => d.isDirectory())) {
      try {
        const folderPath = patientFolder.name;
        
        // Get patient ID
        const patient = db.prepare('SELECT id FROM patients WHERE folder_path = ?').get(folderPath) as { id: number } | undefined;
        if (!patient) continue;

        const patientPath = path.join(patientsRoot, folderPath);
        const appointmentFolders = await fs.readdir(patientPath, { withFileTypes: true });

        for (const appointmentFolder of appointmentFolders.filter(d => d.isDirectory())) {
          const appointmentDate = appointmentFolder.name;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) continue;

          // Get appointment ID
          const appointment = db.prepare(`
            SELECT id FROM appointments 
            WHERE patient_id = ? AND appointment_date = ?
          `).get(patient.id, appointmentDate) as { id: number } | undefined;

          const testsPath = path.join(patientPath, appointmentDate, 'tests');
          
          try {
            const testFiles = await fs.readdir(testsPath);
            
            for (const testFile of testFiles) {
              if (!testFile.endsWith('.json')) continue;

              try {
                const testFilePath = path.join(testsPath, testFile);
                const testContent = await fs.readFile(testFilePath, 'utf8');
                const testData = JSON.parse(testContent);

                // Check if template exists, create if not
                let templateId = null;
                if (testData.testId) {
                  const template = db.prepare('SELECT id FROM test_templates WHERE id = ?').get(testData.testId) as { id: number } | undefined;
                  if (!template) {
                    // Create template from test data
                    const templateResult = db.prepare(`
                      INSERT INTO test_templates (name, test_type, template_data)
                      VALUES (?, ?, ?)
                    `).run(
                      testData.testName || 'Unknown Test',
                      testData.testType || 'questionnaire',
                      JSON.stringify(testData.testData || {})
                    );
                    templateId = Number(templateResult.lastInsertRowid);
                  } else {
                    templateId = template.id;
                  }
                }

                // Insert patient test
                if (templateId) {
                  db.prepare(`
                    INSERT INTO patient_tests (patient_id, appointment_id, test_template_id, test_name, test_type, test_data, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `).run(
                    patient.id,
                    appointment?.id || null,
                    templateId,
                    testData.testName || 'Unknown Test',
                    testData.testType || 'questionnaire',
                    JSON.stringify(testData.testData || testData),
                    testData.createdAt || new Date().toISOString(),
                    testData.updatedAt || new Date().toISOString()
                  );

                  result.stats.tests++;
                }
              } catch (error) {
                console.error(`Error migrating test file ${testFile}:`, error);
                result.errors.push(`Test ${patientFolder.name}/${appointmentFolder.name}/${testFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          } catch {
            // Tests folder doesn't exist for this appointment, skip
          }
        }
      } catch (error) {
        console.error(`Error processing tests for patient ${patientFolder.name}:`, error);
      }
    }

    console.log(`Migrated ${result.stats.tests} tests`);
  } catch (error) {
    console.error('Error migrating tests:', error);
    result.errors.push(`Tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

