// src/helpers/scanUsb.ts
export interface Project {
  folder: string;
  date: string;
}

export const scanUsb  = () => window.electronAPI.scanUsb();
export const getLocal = () => window.electronAPI.getProjects();