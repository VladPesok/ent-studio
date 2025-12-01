export interface Patient {
  name: string;
  birthdate: string;
  latestAppointmentDate: string;
  doctor: string;
  diagnosis: string;
  patientCard: string;
  folder: string; // Keep for backward compatibility
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

export interface PatientFilters {
  search?: string;
  name?: string;
  bithdate?: [any, any] | null;
  appointmentDate?: [any, any] | null;
  doctor?: string[];
  diagnosis?: string[];
  status?: number[];
  sortField?: string;
  sortOrder?: 'ascend' | 'descend';
  page?: number;
  pageSize?: number;
}

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

export const getPatients = async (filters?: PatientFilters): Promise<PaginatedResult<Patient>> => {
  // Get patients from database
  const allPatients = await window.ipcRenderer.invoke("db:patients:getAll");

  let filteredPatients = allPatients;

  if (filters) {
    filteredPatients = allPatients.filter((patient: Patient) => {
      // Search filter (legacy search input)
      if (filters.search) {
        const term = filters.search.trim().toLowerCase();
        const matchesSearch = patient.name.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // Name filter (from column filter)
      if (filters.name) {
        const term = filters.name.toLowerCase();
        const fullName = patient.name.toLowerCase();
        if (!fullName.includes(term)) return false;
      }
      
      // Date of birth filter
      if (filters.bithdate && Array.isArray(filters.bithdate)) {
        const [start, end] = filters.bithdate;
        if (start || end) {
          const dobString = patient.birthdate;
          if (!dobString) return false;
          
          // Parse birthdate in YYYY-MM-DD format
          const [year, month, day] = dobString.split('-');
          if (!day || !month || !year) return false;
          
          const dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (start && !end) {
            if (dobDate < start.startOf('day').toDate()) return false;
          } else if (!start && end) {
            if (dobDate > end.endOf('day').toDate()) return false;
          } else if (start && end) {
            if (dobDate < start.startOf('day').toDate() || dobDate > end.endOf('day').toDate()) return false;
          }
        }
      }
      
      // Visit date filter
      if (filters.appointmentDate && Array.isArray(filters.appointmentDate)) {
        const [start, end] = filters.appointmentDate;
        if (start || end) {
          const visitDate = new Date(patient.latestAppointmentDate);
          
          if (start && !end) {
            if (visitDate < start.startOf('day').toDate()) return false;
          } else if (!start && end) {
            if (visitDate > end.endOf('day').toDate()) return false;
          } else if (start && end) {
            if (visitDate < start.startOf('day').toDate() || visitDate > end.endOf('day').toDate()) return false;
          }
        }
      }
      
      // Doctor filter
      if (filters.doctor && filters.doctor.length > 0) {
        if (!filters.doctor.includes(patient.doctor)) return false;
      }
      
      // Diagnosis filter
      if (filters.diagnosis && filters.diagnosis.length > 0) {
        if (!filters.diagnosis.includes(patient.diagnosis)) return false;
      }
      
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(patient.statusId)) return false;
      }
      
      return true;
    });
  }
  
  // Apply sorting
  if (filters?.sortField && filters?.sortOrder) {
    filteredPatients.sort((a: Patient, b: Patient) => {
      let valueA: any;
      let valueB: any;
      
      let comparison: number;
      
      switch (filters.sortField) {
        case 'name': // Patient name
          valueA = a.name;
          valueB = b.name;
          comparison = String(valueA).localeCompare(String(valueB));
          break;
        case 'birthdate': // Date of birth
          // Parse YYYY-MM-DD format explicitly
          const [yearA, monthA, dayA] = a.birthdate.split('-').map(Number);
          const [yearB, monthB, dayB] = b.birthdate.split('-').map(Number);

          valueA = new Date(yearA, monthA - 1, dayA).getTime();
          valueB = new Date(yearB, monthB - 1, dayB).getTime();

          comparison = valueA - valueB;
          break;
        case 'doctor': // Doctor
          valueA = a.doctor || '';
          valueB = b.doctor || '';
          comparison = String(valueA).localeCompare(String(valueB));
          break;
        case 'diagnosis': // Diagnosis
          valueA = a.diagnosis || '';
          valueB = b.diagnosis || '';
          comparison = String(valueA).localeCompare(String(valueB));
          break;
        case 'status': // Status
          valueA = a.statusName || '';
          valueB = b.statusName || '';
          comparison = String(valueA).localeCompare(String(valueB));
          break;
        case 'appointmentDate':
        default:
          // Parse YYYY-MM-DD format explicitly
          const [yearA2, monthA2, dayA2] = a.latestAppointmentDate.split('-').map(Number);
          const [yearB2, monthB2, dayB2] = b.latestAppointmentDate.split('-').map(Number);
          valueA = new Date(yearA2, monthA2 - 1, dayA2).getTime();
          valueB = new Date(yearB2, monthB2 - 1, dayB2).getTime();
          comparison = valueA - valueB;
      }
      
      return filters.sortOrder === 'ascend' ? comparison : -comparison;
    });
  } else {
    // Default sorting by visit date (newest first)
    filteredPatients.sort((a: Patient, b: Patient) => (a.latestAppointmentDate < b.latestAppointmentDate ? 1 : -1));
  }
  
  // Apply pagination
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const total = filteredPatients.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredPatients.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    total,
    page,
    pageSize
  };
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
}

export const getPatientStatuses = async (): Promise<PatientStatus[]> => {
  return window.ipcRenderer.invoke("db:patientStatuses:getAll");
};

export const updatePatientStatus = async (folder: string, statusId: number): Promise<void> => {
  await window.ipcRenderer.invoke("db:patients:updateStatus", folder, statusId);
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
