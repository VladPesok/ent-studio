import type { DictionaryType } from "../../electron/preload";
const api = window.electronAPI;

export type TabEntry = { name?: string; folder: string }; // "folder" is FS-safe id, name only for custom tabs

/* ---------- dictionaries ---------- */
export const getDictionaries = async () => await api.getDictionaries();
export const addDictionaryEntry = (entryName: DictionaryType, name: string) =>
  api.addDictionaryEntry(entryName, name);

/* ---------- settings ---------- */
export const getSettings = () => api.getSettings();
export const setSettings = (patch: Partial<{ theme:"light"|"dark"; locale:"en"|"ua" }>) =>
  api.setSettings(patch);

/* ---------- session ---------- */
export const getSession = () => api.getSession();
export const setSession = (patch: Partial<{ currentDoctor: string|null }>) =>
  api.setSession(patch);



/* ---------- get / set shownTabs ---------- */
export const getDefaultTabs = (): TabEntry[] => [
  { folder: "video" },
  { folder: "audio" }
] as TabEntry[];

export const getShownTabs = async (): Promise<TabEntry[]> => {
  try {
    return await window.electronAPI.getShownTabs();
  } catch {
    return getDefaultTabs();
  }
};

export const setShownTabs = async (tabs: TabEntry[]): Promise<void> => {
  await window.electronAPI.setShownTabs(tabs.map(tab => ({
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