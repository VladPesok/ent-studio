import { DictionaryType } from "electron/preload";
const api = window.electronAPI;

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
