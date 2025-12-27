export interface Patient {
  name: string;
  birthdate: string;
  latestAppointmentDate: string;
  doctor: string;
  doctorId?: number | null;
  diagnosis: string;
  diagnosisId?: number | null;
  patientCard: string;
  folder: string;
  statusId: number;
  statusName: string;
}

export interface AppointmentConfig {
  doctors: string[];
  diagnosis: string;
  notes: string;
}

export interface Appointment extends AppointmentConfig {
  date: string;
}

export interface PatientConfig {
  doctor: string;
  diagnosis: string;
  patientCard: string;
}

export interface Patient extends PatientConfig {
  name: string;
  birthdate: string;
  latestAppointmentDate: string;
  appointments: Appointment[];
  statusId: number;
  statusName: string;
}

// Filters sent to database
export interface PatientFilters {
  search?: string;
  name?: string;
  birthdateFrom?: string;
  birthdateTo?: string;
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  doctorNames?: string[];
  diagnosisText?: string;
  statusIds?: number[];
  sortField?: string;
  sortOrder?: 'ascend' | 'descend';
  page?: number;
  pageSize?: number;
}

// Table state from UI (with dayjs objects and string arrays)
export interface TableState {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: {
    [key: string]: any;
    name?: string[];
    folder?: string[];
    bithdate?: [any, any][];
    appointmentDate?: [any, any][];
    doctor?: string[];
    diagnosis?: string[];
    status?: number[];
  };
  sorter: {
    field?: string;
    order?: 'ascend' | 'descend';
  };
  search: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Convert UI table state to database filter format
 */
export function tableStateToDbFilters(tableState: TableState): PatientFilters {
  const filters: PatientFilters = {
    page: tableState.pagination.current,
    pageSize: tableState.pagination.pageSize,
  };

  // Search
  if (tableState.search) {
    filters.search = tableState.search;
  }

  // Name filter
  if (tableState.filters.name?.[0]) {
    filters.name = tableState.filters.name[0];
  }

  // Birthdate range
  if (tableState.filters.bithdate?.[0]) {
    const [start, end] = tableState.filters.bithdate[0];
    if (start) filters.birthdateFrom = start.format('YYYY-MM-DD');
    if (end) filters.birthdateTo = end.format('YYYY-MM-DD');
  }

  // Appointment date range
  if (tableState.filters.appointmentDate?.[0]) {
    const [start, end] = tableState.filters.appointmentDate[0];
    if (start) filters.appointmentDateFrom = start.format('YYYY-MM-DD');
    if (end) filters.appointmentDateTo = end.format('YYYY-MM-DD');
  }

  // Doctor filter (by names directly)
  if (tableState.filters.doctor?.length) {
    filters.doctorNames = tableState.filters.doctor;
  }

  // Diagnosis filter (text search)
  if (tableState.filters.diagnosis?.[0]) {
    filters.diagnosisText = tableState.filters.diagnosis[0];
  }

  // Status filter
  if (tableState.filters.status?.length) {
    filters.statusIds = tableState.filters.status;
  }

  // Sorting
  if (tableState.sorter.field) {
    filters.sortField = tableState.sorter.field;
    filters.sortOrder = tableState.sorter.order;
  }

  return filters;
}

/**
 * Get patients with database-level filtering, sorting, and pagination
 */
export const getPatients = async (filters?: PatientFilters): Promise<PaginatedResult<Patient>> => {
  return window.ipcRenderer.invoke("db:patients:getFiltered", filters);
};

/**
 * Get all patients without filtering (for backward compatibility)
 */
export const getAllPatients = async (): Promise<Patient[]> => {
  return window.ipcRenderer.invoke("db:patients:getAll");
};

// USB import - combines FS operations with DB creation
export const scanUsb = async (): Promise<Patient[]> => {
  // First, get USB folder info from filesystem
  const usbResult = await window.ipcRenderer.invoke("fs:scanUsb");
  
  if (usbResult.canceled || usbResult.folders.length === 0) {
    return window.ipcRenderer.invoke("db:patients:getAll");
  }

  // Get default patient card setting from database
  const defaultPatientCard = await window.ipcRenderer.invoke("db:settings:get", 'defaultPatientCard');
  
  const totalFolders = usbResult.folders.length;
  
  // Process each folder
  for (let i = 0; i < usbResult.folders.length; i++) {
    const folder = usbResult.folders[i];
    const progress = Math.round(((i + 1) / totalFolders) * 100);
    
    // Send progress update
    await window.ipcRenderer.invoke("fs:sendImportProgress", {
      current: i + 1,
      total: totalFolders,
      progress,
      folderName: folder.folderName,
    });
    
    // Copy files from USB
    const copyResult = await window.ipcRenderer.invoke(
      "fs:copyUsbSession",
      folder.fullPath,
      folder.patientBase,
      folder.recDate
    );
    
    // Create patient in database
    if (!copyResult.skipped) {
      const [surname = '', name = '', dob = ''] = folder.patientBase.split('_');
      await window.ipcRenderer.invoke("db:patients:create", folder.patientBase, folder.recDate, {
        name: `${surname} ${name}`.trim(),
        birthdate: dob,
        doctor: '',
        diagnosis: '',
        patientCard: defaultPatientCard || undefined,
      });
      
      // Copy patient card if available
      if (defaultPatientCard) {
        await window.ipcRenderer.invoke("fs:patientCards:copyToPatient", defaultPatientCard, folder.patientBase);
        await window.ipcRenderer.invoke("db:patients:updateMeta", folder.patientBase, { patientCard: defaultPatientCard });
      }
    }
  }

  return window.ipcRenderer.invoke("db:patients:getAll");
};

// Create new patient - combines FS and DB operations
export const makePatient = async (
  base: string,
  date: string,
  metadata?: { name: string; birthdate: string; doctor: string; diagnosis: string; patientCard?: string }
) => {
  // Create folder structure
  await window.ipcRenderer.invoke("fs:patient:createFolders", base, date);
  
  // Create patient in database
  await window.ipcRenderer.invoke("db:patients:create", base, date, metadata);
};

export const openPatientFolderInFs = (folder: string) => 
  window.ipcRenderer.invoke("fs:patient:openFolder", folder);

// Patient data operations - DB only
export const getPatientAppointment = async (appointmentPath: string) => {
  const parts = appointmentPath.split('/');
  const date = parts[parts.length - 1];
  const folder = parts.slice(0, -1).join('/');
  return window.ipcRenderer.invoke("db:appointments:get", folder, date);
};

export const getPatientMeta = async (folder: string): Promise<Patient> => {
  // Get patient-level data from database
  const meta = await window.ipcRenderer.invoke("db:patients:getByFolder", folder);
  
  // Get appointments from database
  const appointments = await window.ipcRenderer.invoke("db:patients:getAppointments", folder);

  // Sort appointments by date (newest first)
  const sortedAppointments = appointments.sort((a: Appointment, b: Appointment) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return {
    ...meta,
    appointments: sortedAppointments
  };
};

// Save data to patient (patient-level) - DB only
export const setPatient = (folder: string, data: { doctor?: string; diagnosis?: string; patientCard?: string }) =>
  window.ipcRenderer.invoke("db:patients:updateMeta", folder, data);

// Save data to appointment (appointment-level) - DB only
export const setPatientAppointments = async (appointmentPath: string, data: { doctors?: string[]; diagnosis?: string; notes?: string }) => {
  const parts = appointmentPath.split('/');
  const date = parts[parts.length - 1];
  const folder = parts.slice(0, -1).join('/');
  return window.ipcRenderer.invoke("db:appointments:update", folder, date, data);
};

// Audio-related functions - FS only
export const getAudioFiles = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:patient:audioFiles", baseFolder, currentAppointment);

export const loadMoreAudio = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:patient:loadMoreAudio", baseFolder, currentAppointment);

export const openAudioFolder = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:patient:openAudioFolder", baseFolder, currentAppointment);

export const saveRecordedAudio = (baseFolder: string, currentAppointment: string | undefined, arrayBuffer: ArrayBuffer, filename: string) => 
  window.ipcRenderer.invoke("fs:patient:saveRecordedAudio", baseFolder, currentAppointment, arrayBuffer, filename);

// Video-related functions - FS only
export const getClipsDetailed = (baseFolder: string, offset: number, limit: number, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:patient:clipsDetailed", baseFolder, offset, limit, currentAppointment);

export const loadMoreVideos = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:patient:loadMoreVideos", baseFolder, currentAppointment);

// Custom tab functions - FS only
export const getCustomTabFiles = (baseFolder: string, tabName: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:customTab:getFiles", baseFolder, tabName, currentAppointment);

export const selectAndCopyFiles = (baseFolder: string, tabName: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("fs:customTab:selectAndCopyFiles", baseFolder, tabName, currentAppointment);

export const openFileInDefaultApp = (filePath: string) => 
  window.ipcRenderer.invoke("fs:openFileInDefaultApp", filePath);

// Utility function
export const parsePatientFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

// Patient status operations
export interface PatientStatus {
  id: number;
  name: string;
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const getPatientStatuses = async (includeDeleted: boolean = true): Promise<PatientStatus[]> => {
  return window.ipcRenderer.invoke("db:patientStatuses:getAll", includeDeleted);
};

export const updatePatientStatus = async (folder: string, statusId: number): Promise<void> => {
  await window.ipcRenderer.invoke("db:patients:updateStatus", folder, statusId);
};

export const createPatientStatusEntry = async (name: string): Promise<number> => {
  return window.ipcRenderer.invoke("db:patientStatuses:create", name);
};

export const updatePatientStatusEntry = async (id: number, name: string): Promise<boolean> => {
  return window.ipcRenderer.invoke("db:patientStatuses:update", id, name);
};

export const deletePatientStatusEntry = async (id: number): Promise<boolean> => {
  return window.ipcRenderer.invoke("db:patientStatuses:delete", id);
};

export const restorePatientStatusEntry = async (id: number): Promise<boolean> => {
  return window.ipcRenderer.invoke("db:patientStatuses:restore", id);
};

export const getDefaultPatientStatus = async (): Promise<PatientStatus | null> => {
  return window.ipcRenderer.invoke("db:patientStatuses:getDefault");
};

export const setDefaultPatientStatus = async (id: number): Promise<boolean> => {
  return window.ipcRenderer.invoke("db:patientStatuses:setDefault", id);
};

// Patient rename operations
export const checkPatientExists = async (folder: string): Promise<boolean> => {
  return window.ipcRenderer.invoke("db:patients:exists", folder);
};

export const renamePatient = async (
  oldFolder: string,
  newFolder: string,
  surname: string,
  name: string,
  birthdate: string
): Promise<{ success: boolean; error?: string }> => {
  // First rename the folder on filesystem
  const fsResult = await window.ipcRenderer.invoke("fs:patient:renameFolder", oldFolder, newFolder);
  if (!fsResult.success) {
    return fsResult;
  }
  
  // Then update the database
  const dbResult = await window.ipcRenderer.invoke("db:patients:rename", oldFolder, newFolder, surname, name, birthdate);
  return dbResult;
};

export const buildPatientFolder = (surname: string, name: string, birthdate: string): string => {
  return `${surname}_${name}_${birthdate}`;
};

// Lightweight patient info for selects
export interface PatientListItem {
  id: number;
  surname: string;
  name: string;
  birthdate: string;
  folder: string;
}

// Get lightweight list of all patients (for select dropdowns)
export const getAllPatientsLightweight = async (): Promise<PatientListItem[]> => {
  return window.ipcRenderer.invoke("db:patients:getAllLightweight");
};

// Merge patients
export interface MergeResult {
  success: boolean;
  error?: string;
}

export const mergePatients = async (sourceFolder: string, targetFolder: string): Promise<MergeResult> => {
  try {
    // 1. Get appointment dates from source patient
    const sourceDates = await window.ipcRenderer.invoke("db:patients:getAppointmentDates", sourceFolder);
    
    // 2. Merge folders on filesystem (copy appointment folders)
    const fsResult = await window.ipcRenderer.invoke("fs:patient:mergeAppointments", sourceFolder, targetFolder, sourceDates);
    if (!fsResult.success) {
      return { success: false, error: fsResult.error || 'Помилка копіювання файлів' };
    }
    
    // 3. Merge appointments in database
    const dbResult = await window.ipcRenderer.invoke("db:patients:mergeAppointments", sourceFolder, targetFolder);
    
    // 4. Delete source patient from database
    await window.ipcRenderer.invoke("db:patients:deleteWithAppointments", sourceFolder);
    
    // 5. Delete source patient folder from filesystem
    await window.ipcRenderer.invoke("fs:patient:deleteFolder", sourceFolder);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to merge patients:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Помилка об\'єднання пацієнтів' };
  }
};
