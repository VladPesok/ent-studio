export interface Patient {
  name: string;
  birthdate: string;
  latestAppointmentDate: string;
  doctor: string;
  diagnosis: string;
  patientCard: string;
  folder: string; // Keep for backward compatibility
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
}

export interface PatientFilters {
  search?: string;
  name?: string;
  bithdate?: [any, any] | null;
  appointmentDate?: [any, any] | null;
  doctor?: string[];
  diagnosis?: string[];
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
  const allPatients = await window.ipcRenderer.invoke("getProjects");

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

// USB and project operations
export const scanUsb = (): Promise<Patient[]> => window.ipcRenderer.invoke("scanUsb");
export const makePatient = (base: string, date: string, metadata?: { name: string; birthdate: string; doctor: string; diagnosis: string; patientCard?: string }) => window.ipcRenderer.invoke("patient:new", base, date, metadata);
export const openPatientFolderInFs = (folder: string) => window.ipcRenderer.invoke("patient:openFolder", folder);

// Patient data operations
export const getPatientAppointment = (appointmentPath: string) => window.ipcRenderer.invoke("patient:getAppointment", appointmentPath);

export const getPatientMeta = async (folder: string): Promise<Patient> => {
  // Get patient-level data from patient.config
  const meta = await window.ipcRenderer.invoke("patient:getMeta", folder);
  
  // Get appointments (date folders inside patient folder)
  const appointments = await window.ipcRenderer.invoke("patient:appointments", folder);

  // Sort appointments by date (newest first)
  const sortedAppointments = appointments.sort((a: Appointment, b: Appointment) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return {
    ...meta,
    appointments: sortedAppointments
  };
};

// Save data to patient.config (patient-level)
export const setPatient = (folder: string, data: { doctor?: string; diagnosis?: string; patientCard?: string }) =>
  window.ipcRenderer.invoke("patient:setMeta", folder, data);

// Save data to appointment.config (appointment-level)
export const setPatientAppointments = (appointmentPath: string, data: { doctors?: string[]; diagnosis?: string; notes?: string }) =>
  window.ipcRenderer.invoke("patient:setAppointment", appointmentPath, data);

// Audio-related functions
export const getAudioFiles = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("patient:audioFiles", baseFolder, currentAppointment);

export const loadMoreAudio = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("patient:loadMoreAudio", baseFolder, currentAppointment);

export const openAudioFolder = (baseFolder: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("patient:openAudioFolder", baseFolder, currentAppointment);
export const saveRecordedAudio = (baseFolder: string, currentAppointment: string | undefined, arrayBuffer: ArrayBuffer, filename: string) => 
  window.ipcRenderer.invoke("patient:saveRecordedAudio", baseFolder, currentAppointment, arrayBuffer, filename);

// Video-related functions
export const getClipsDetailed = (baseFolder: string, offset: number, limit: number) => 
  window.ipcRenderer.invoke("patient:clipsDetailed", baseFolder, offset, limit);
export const loadMoreVideos = (baseFolder: string) => 
  window.ipcRenderer.invoke("patient:loadMoreVideos", baseFolder);

// Custom tab functions
export const getCustomTabFiles = (baseFolder: string, tabName: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("getCustomTabFiles", baseFolder, tabName, currentAppointment);
export const selectAndCopyFiles = (baseFolder: string, tabName: string, currentAppointment?: string) => 
  window.ipcRenderer.invoke("selectAndCopyFiles", baseFolder, tabName, currentAppointment);
export const openFileInDefaultApp = (filePath: string) => 
  window.ipcRenderer.invoke("openFileInDefaultApp", filePath);

// Utility function
export const parsePatientFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};


