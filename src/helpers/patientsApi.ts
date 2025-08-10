// All patient-related IPC calls live here
export interface Patient {
  folder: string;
  date: string;
  doctor: string;
  diagnosis: string;
}

export interface Appointment {
  date: string;
  folder: string;
}

export interface PatientMeta {
  doctor?: string;
  diagnosis?: string;
  appointments?: Appointment[];
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
  const allPatients = await window.electronAPI.getProjects();
  
  let filteredPatients = allPatients;

  if (filters) {
    filteredPatients = allPatients.filter((patient: Patient) => {
      // Search filter (legacy search input)
      if (filters.search) {
        const term = filters.search.trim().toLowerCase();
        const { surname, name } = parsePatientFolder(patient.folder);
        const matchesSearch = surname.toLowerCase().includes(term) || name.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // Name filter (from column filter)
      if (filters.name) {
        console.log(filters.name)
        const term = filters.name.toLowerCase();
        const { surname, name } = parsePatientFolder(patient.folder);
        const fullName = `${surname} ${name}`.toLowerCase();
        if (!fullName.includes(term)) return false;
      }
      
      // Date of birth filter
      if (filters.bithdate && Array.isArray(filters.bithdate)) {
        const [start, end] = filters.bithdate;
        if (start || end) {
          const dobString = parsePatientFolder(patient.folder).dob;
          if (!dobString) return false;
          
          const [day, month, year] = dobString.split('.');
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
          const visitDate = new Date(patient.date);
          
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
      
      switch (filters.sortField) {
        case 'pn': // Patient name
          const nameA = parsePatientFolder(a.folder);
          const nameB = parsePatientFolder(b.folder);
          valueA = `${nameA.surname} ${nameA.name}`;
          valueB = `${nameB.surname} ${nameB.name}`;
          break;
        case 'dob': // Date of birth
          valueA = parsePatientFolder(a.folder).dob;
          valueB = parsePatientFolder(b.folder).dob;
          break;
        case 'visit': // Visit date
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
          break;
        case 'doc': // Doctor
          valueA = a.doctor || '';
          valueB = b.doctor || '';
          break;
        case 'diag': // Diagnosis
          valueA = a.diagnosis || '';
          valueB = b.diagnosis || '';
          break;
        default:
          valueA = a.date;
          valueB = b.date;
      }
      
      let comparison = 0;
      if (filters.sortField === 'visit') {
        // For dates, use numeric comparison
        comparison = valueA - valueB;
      } else {
        // For strings, use locale comparison
        comparison = String(valueA).localeCompare(String(valueB));
      }
      
      return filters.sortOrder === 'ascend' ? comparison : -comparison;
    });
  } else {
    // Default sorting by visit date (newest first)
    filteredPatients.sort((a: Patient, b: Patient) => (a.date < b.date ? 1 : -1));
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

export const scanUsb = (): Promise<Patient[]> => window.electronAPI.scanUsb();
export const makePatient = (base: string, date: string) => window.electronAPI.makePatient(base, date);
export const openPatientFolderInFs = (folder: string) => window.electronAPI.openPatientFolderInFs(folder);

export const getPatientMeta = async (folder: string): Promise<PatientMeta> => {
  // Get patient-level data from patient.config
  const meta = await window.electronAPI.getPatient(folder);
  
  // Get appointments (date folders inside patient folder)
  const appointments = await window.electronAPI.getPatientAppointments(folder);

  // Sort appointments by date (newest first)
  const sortedAppointments = appointments.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return {
    ...meta,
    appointments: sortedAppointments
  };
};

// Save data to patient.config (patient-level)
export const setPatient = (folder: string, data: { doctor?: string; diagnosis?: string }) =>
  window.electronAPI.setPatient(folder, data);

// Save data to appointment.config (appointment-level)
export const setPatientAppointments = (appointmentPath: string, data: { doctor?: string; diagnosis?: string; notes?: string }) =>
  window.electronAPI.setPatientAppointments(appointmentPath, data);

export const parsePatientFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};


