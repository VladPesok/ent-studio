// All patient-related IPC calls live here
export interface Patient {
  folder: string;   // Байрак_Андрій_1986-12-24
  date:   string;   // latest appointment YYYY-MM-DD
}

export const getPatients        = (): Promise<Patient[]>          => window.electronAPI.getProjects();
export const scanUsb            = (): Promise<Patient[]>          => window.electronAPI.scanUsb();
export const makePatient        = (base: string, date: string)    => window.electronAPI.makePatient(base, date);
export const openPatientFolder  = (folder: string)                => window.electronAPI.openPatientFolder(folder);
export const getPatientMeta     = (folder: string): Promise<{ doctor?: string; diagnosis?: string }> =>
  window.electronAPI.getPatient(folder);
