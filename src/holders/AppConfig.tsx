import React, { createContext, useState, useMemo, useEffect } from "react";
import * as configApi from "../helpers/configApi";

export type ThemeMode  = "light" | "dark";
export type LocaleCode = "en" | "ua";

export interface AppConfig {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;

  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;

  currentDoctor: string | null;
  setCurrentDoctor: (u: string | null) => void;

  doctors: string[];
  addDoctor: (u: string) => void;
}

export const AppConfigContext = createContext<AppConfig>(null!);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme]                 = useState<ThemeMode>("light");
  const [locale, setLocale]               = useState<LocaleCode>("en");
  const [doctors, setDoctors]             = useState<string[]>([]);
  const [currentDoctor, setCurrentDoctor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [settings, dictionaries, session] = await Promise.all([
        configApi.getSettings(),
        configApi.getDictionaries(),
        configApi.getSession(),
      ]);

      setTheme(settings.theme);
      setLocale(settings.locale);
      setDoctors(dictionaries.doctors);
      setCurrentDoctor(session.currentDoctor);
    })();
  }, []);

  useEffect(() => { configApi.setSettings({ theme }); }, [theme]);
  useEffect(() => { configApi.setSettings({ locale }); }, [locale]);
  useEffect(() => { configApi.setSession ({ currentDoctor }); }, [currentDoctor]);

  const addDoctor = async (name: string) => {
    if (!name.trim() || doctors.includes(name)) return;
    await configApi.addDictionaryEntry('doctors', name);
    setDoctors((prev) => [...prev, name]);
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
    }),
    [theme, locale, currentDoctor, doctors],
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};
