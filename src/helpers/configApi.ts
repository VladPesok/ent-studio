// Config API - uses both database and filesystem IPC handlers

export type TabEntry = { name?: string; folder: string };
export type DictionaryType = "doctors" | "diagnosis";

/* ---------- dictionaries (DB) ---------- */
export const getDictionaries = async () => await window.ipcRenderer.invoke("db:dict:get");

export const addDictionaryEntry = async (entryName: DictionaryType, name: string) => {
  if (entryName === "doctors") {
    return window.ipcRenderer.invoke("db:dict:addDoctor", name);
  } else {
    return window.ipcRenderer.invoke("db:dict:addDiagnosis", name);
  }
};

/* ---------- settings (DB) ---------- */
export const getSettings = () => window.ipcRenderer.invoke("db:settings:getAll");

export const setSettings = async (patch: Partial<{ theme: "light" | "dark"; locale: "en" | "ua"; praatPath?: string; defaultPatientCard?: string | null }>) => {
  if (patch.theme !== undefined) await window.ipcRenderer.invoke("db:settings:set", 'theme', patch.theme);
  if (patch.locale !== undefined) await window.ipcRenderer.invoke("db:settings:set", 'locale', patch.locale);
  if (patch.praatPath !== undefined) await window.ipcRenderer.invoke("db:settings:set", 'praatPath', patch.praatPath);
  if (patch.defaultPatientCard !== undefined) await window.ipcRenderer.invoke("db:settings:set", 'defaultPatientCard', patch.defaultPatientCard);
};

/* ---------- session (DB) ---------- */
export const getSession = () => window.ipcRenderer.invoke("db:session:getAll");

export const setSession = async (patch: Partial<{ currentDoctor: string | null }>) => {
  if (patch.currentDoctor !== undefined) await window.ipcRenderer.invoke("db:session:set", 'currentDoctor', patch.currentDoctor);
};

/* ---------- tabs (DB) ---------- */
export const getDefaultTabs = (): TabEntry[] => [
  { folder: "video" },
  { folder: "audio" },
  { folder: "tests" }
] as TabEntry[];

export const getShownTabs = async (): Promise<TabEntry[]> => {
  try {
    // Use getVisible to only get tabs that are visible
    return await window.ipcRenderer.invoke("db:tabs:getVisible");
  } catch {
    return getDefaultTabs();
  }
};

export const setShownTabs = async (tabs: TabEntry[]): Promise<void> => {
  await window.ipcRenderer.invoke("db:tabs:update", tabs.map(tab => ({
    name: tab.name || tab.folder,
    folder: tab.folder
  })));
};

export const createFolderName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/* ---------- Praat integration (FS) ---------- */
export const selectPraatExecutable = async (): Promise<string | null> => {
  const result = await window.ipcRenderer.invoke("fs:praat:selectExecutable");
  return result.success ? result.path : null;
};

export const openFileWithPraat = async (praatPath: string, audioFilePath: string): Promise<boolean> => {
  const result = await window.ipcRenderer.invoke("fs:praat:openFile", praatPath, audioFilePath);
  return result.success;
};

/* ---------- Patient Cards (FS) ---------- */
export const getPatientCards = async () => {
  return await window.ipcRenderer.invoke("fs:patientCards:get");
};

export const importPatientCard = async (cardName: string, file: File): Promise<{ success: boolean; error?: string }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.ipcRenderer.invoke("fs:patientCards:import", cardName, arrayBuffer, file.name);
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const getDefaultPatientCard = async (): Promise<string | null> => {
  return await window.ipcRenderer.invoke("db:settings:get", 'defaultPatientCard');
};

export const setDefaultPatientCard = async (fileName: string | null): Promise<void> => {
  await window.ipcRenderer.invoke("db:settings:set", 'defaultPatientCard', fileName);
};

export const copyPatientCardToPatient = async (cardFileName: string, patientFolderName: string): Promise<{ success: boolean; error?: string }> => {
  return await window.ipcRenderer.invoke("fs:patientCards:copyToPatient", cardFileName, patientFolderName);
};

export const openPatientCard = async (patientFolderName: string, cardFileName: string): Promise<{ success: boolean; error?: string | null; fallbackUsed?: boolean }> => {
  return await window.ipcRenderer.invoke("fs:patientCards:openPatientCard", patientFolderName, cardFileName);
};

export const deletePatientCard = async (cardFileName: string): Promise<{ success: boolean; error?: string }> => {
  return await window.ipcRenderer.invoke("fs:patientCards:delete", cardFileName);
};
