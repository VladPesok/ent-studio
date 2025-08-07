// All patient-related IPC calls live here
export interface Patient {
  folder: string;
  date:   string;
}

export interface Appointment {
  date: string;
  folder: string;
}

export interface PatientMeta {
  doctor?: string;
  diagnosis?: string;
  notes?: string;
  voiceReport?: any[];
  appointments?: Appointment[];
  currentAppointment?: string; // current selected appointment date
}

export const getPatients = (): Promise<Patient[]> => window.electronAPI.getProjects();

export const scanUsb = (): Promise<Patient[]> => window.electronAPI.scanUsb();
export const makePatient = (base: string, date: string) => window.electronAPI.makePatient(base, date);
export const openPatientFolderInFs = (folder: string) => window.electronAPI.openPatientFolderInFs(folder);

export const getPatientMeta = async (folder: string): Promise<PatientMeta> => {
  const meta = await window.electronAPI.getPatient(folder);
  
  // Get appointments (date folders inside patient folder)
  const appointments = await window.electronAPI.getPatientAppointments(folder);
  
  // Sort appointments by date (newest first)
  const sortedAppointments = appointments.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return {
    ...meta,
    appointments: sortedAppointments,
    currentAppointment: meta.currentAppointment || sortedAppointments[0]?.date
  };
};

export const getPatient = (folder: string): Promise<PatientMeta> =>
  window.electronAPI.getPatient(folder);

export const setPatient = (folder: string, data: Partial<PatientMeta>) =>
  window.electronAPI.setPatient(folder, data);

// Patient-level metadata (main doctor/diagnosis from patient.config)
export const getPatientMainMeta = (folder: string): Promise<{ doctor: string; diagnosis: string }> =>
  window.electronAPI.getPatientMeta(folder);

export const setPatientMainMeta = (folder: string, data: { doctor?: string; diagnosis?: string }) =>
  window.electronAPI.setPatientMeta(folder, data);

export const parsePatientFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};


