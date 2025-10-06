export type TabEntry = { name?: string; folder: string };
export type DictionaryType = "doctors" | "diagnosis";

/* ---------- dictionaries ---------- */
export const getDictionaries = async () => await window.ipcRenderer.invoke("dict:get");
export const addDictionaryEntry = (entryName: DictionaryType, name: string) =>
  window.ipcRenderer.invoke("dict:add", entryName, name);

/* ---------- settings ---------- */
export const getSettings = () => window.ipcRenderer.invoke("settings:get");
export const setSettings = (patch: Partial<{ theme:"light"|"dark"; locale:"en"|"ua"; praatPath?: string }>) =>
  window.ipcRenderer.invoke("settings:set", patch);

/* ---------- session ---------- */
export const getSession = () => window.ipcRenderer.invoke("session:get");
export const setSession = (patch: Partial<{ currentDoctor: string|null }>) =>
  window.ipcRenderer.invoke("session:set", patch);

/* ---------- get / set shownTabs ---------- */
export const getDefaultTabs = (): TabEntry[] => [
  { folder: "video" },
  { folder: "audio" },
  { folder: "tests" }
] as TabEntry[];

export const getShownTabs = async (): Promise<TabEntry[]> => {
  try {
    return await window.ipcRenderer.invoke("shownTabs:get");
  } catch {
    return getDefaultTabs();
  }
};

export const setShownTabs = async (tabs: TabEntry[]): Promise<void> => {
  await window.ipcRenderer.invoke("shownTabs:set", tabs.map(tab => ({
    name: tab.name || tab.folder,
    folder: tab.folder
  })));
};

export const createFolderName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-я]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

export const selectPraatExecutable = async (): Promise<string | null> => {
  const result = await window.ipcRenderer.invoke("praat:selectExecutable");
  return result.success ? result.path : null;
};

export const openFileWithPraat = async (praatPath: string, audioFilePath: string): Promise<boolean> => {
  const result = await window.ipcRenderer.invoke("praat:openFile", praatPath, audioFilePath);
  return result.success;
};

export const getPatientCards = async () => {
  return await window.ipcRenderer.invoke("patientCards:get");
};

export const importPatientCard = async (cardName: string, file: File): Promise<{ success: boolean; error?: string }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.ipcRenderer.invoke("patientCards:import", cardName, arrayBuffer, file.name);
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};


export const getDefaultPatientCard = async (): Promise<string | null> => {
  return await window.ipcRenderer.invoke("defaultPatientCard:get");
};

export const setDefaultPatientCard = async (fileName: string | null): Promise<void> => {
  await window.ipcRenderer.invoke("defaultPatientCard:set", fileName);
};

export const copyPatientCardToPatient = async (cardFileName: string, patientFolderName: string): Promise<{ success: boolean; error?: string }> => {
  return await window.ipcRenderer.invoke("patientCards:copyToPatient", cardFileName, patientFolderName);
};

export const openPatientCard = async (patientFolderName: string, cardFileName: string): Promise<{ success: boolean; error?: string | null; fallbackUsed?: boolean }> => {
  return await window.ipcRenderer.invoke("patientCards:openPatientCard", patientFolderName, cardFileName);
};

export const deletePatientCard = async (cardFileName: string): Promise<{ success: boolean; error?: string }> => {
  return await window.ipcRenderer.invoke("patientCards:delete", cardFileName);
};