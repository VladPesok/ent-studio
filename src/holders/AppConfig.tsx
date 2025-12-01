import React, { createContext, useState, useMemo, useEffect } from "react";
import * as configApi from "../helpers/configApi";

export type ThemeMode  = "light" | "dark";
export type LocaleCode = "en" | "ua";

export interface PatientCard {
  name: string;
  path: string;
  size: number;
  modified: Date;
  extension: string;
}

export interface AppConfig {
  theme: ThemeMode;
  setTheme(t: ThemeMode): void;

  locale: LocaleCode;
  setLocale(l: LocaleCode): void;

  currentDoctor: string | null;
  setCurrentDoctor(u: string | null): void;

  doctors: string[];
  addDoctor(u: string): Promise<void>;

  diagnoses: string[];
  addDiagnosis(d: string): Promise<void>;

  refreshDictionaries(): Promise<void>;

  patientCards: PatientCard[];
  defaultPatientCard: string | null;
  loadPatientCards(): Promise<void>;
  importPatientCard(cardName: string, file: File): Promise<{ success: boolean; error?: string }>;
  deletePatientCard(cardFileName: string): Promise<{ success: boolean; error?: string }>;
  setDefaultPatientCard(fileName: string | null): Promise<void>;
  getEffectiveDefaultCard(): string | null;
}

export const AppConfigContext = createContext<AppConfig>(null!);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme]                 = useState<ThemeMode>("light");
  const [locale, setLocale]               = useState<LocaleCode>("en");
  const [doctors, setDoctors]             = useState<string[]>([]);
  const [diagnoses, setDiagnoses]         = useState<string[]>([]);
  const [currentDoctor, setCurrentDoctor] = useState<string | null>(null);
  const [patientCards, setPatientCards]   = useState<PatientCard[]>([]);
  const [defaultPatientCard, setDefaultPatientCardState] = useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [settings, dictionaries, session, cards, defaultCard] = await Promise.all([
        configApi.getSettings(),
        configApi.getDictionaries(),
        configApi.getSession(),
        configApi.getPatientCards(),
        configApi.getDefaultPatientCard(),
      ]);

      setTheme(settings.theme);
      setLocale(settings.locale);
      setDoctors(dictionaries.doctors);
      setDiagnoses(dictionaries.diagnosis);
      setCurrentDoctor(session.currentDoctor);
      setPatientCards(cards);
      setDefaultPatientCardState(defaultCard);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    configApi.setSettings({ theme, locale });
  }, [loaded, theme, locale]);

  useEffect(() => {
    if (!loaded) return;
    configApi.setSession({ currentDoctor });
  }, [loaded, currentDoctor]);

  const addDoctor = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || doctors.includes(trimmed)) return;
    await configApi.addDictionaryEntry("doctors", trimmed);
    setDoctors((prev) => [...prev, trimmed]);
  };

  const addDiagnosis = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || diagnoses.includes(trimmed)) return;
    await configApi.addDictionaryEntry("diagnosis", trimmed);
    setDiagnoses((prev) => [...prev, trimmed]);
  };

  const refreshDictionaries = async () => {
    try {
      const dictionaries = await configApi.getDictionaries();
      setDoctors(dictionaries.doctors);
      setDiagnoses(dictionaries.diagnosis);
    } catch (error) {
      console.error('Failed to refresh dictionaries:', error);
    }
  };

  const loadPatientCards = async () => {
    try {
      const [cards, defaultCard] = await Promise.all([
        configApi.getPatientCards(),
        configApi.getDefaultPatientCard()
      ]);
      setPatientCards(cards);
      setDefaultPatientCardState(defaultCard);
    } catch (error) {
      console.error('Failed to load patient cards:', error);
    }
  };

  const importPatientCard = async (cardName: string, file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await configApi.importPatientCard(cardName, file);
      if (result.success) {
        // Reload cards after successful import
        await loadPatientCards();
      }
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const deletePatientCard = async (cardFileName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await configApi.deletePatientCard(cardFileName);
      if (result.success) {
        // If deleting the default card, reset default to null
        if (defaultPatientCard === cardFileName) {
          await configApi.setDefaultPatientCard(null);
          setDefaultPatientCardState(null);
        }
        // Reload cards after successful deletion
        await loadPatientCards();
      }
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const setDefaultPatientCard = async (fileName: string | null): Promise<void> => {
    try {
      await configApi.setDefaultPatientCard(fileName);
      setDefaultPatientCardState(fileName);
    } catch (error) {
      console.error('Failed to set default patient card:', error);
      throw error;
    }
  };

  const getEffectiveDefaultCard = (): string | null => {
    if (patientCards.length === 0) return null;
    if (defaultPatientCard) return defaultPatientCard;
    return patientCards[0].name + patientCards[0].extension;
  };

  const value = useMemo<AppConfig>(
    () => ({
      theme,
      setTheme,
      locale,
      setLocale,
      currentDoctor,
      setCurrentDoctor,
      doctors,
      addDoctor,
      diagnoses,
      addDiagnosis,
      refreshDictionaries,
      patientCards,
      defaultPatientCard,
      loadPatientCards,
      importPatientCard,
      deletePatientCard,
      setDefaultPatientCard,
      getEffectiveDefaultCard,
    }),
    [theme, locale, currentDoctor, doctors, diagnoses, patientCards, defaultPatientCard],
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};
