import React, { createContext, useState, useMemo, useEffect } from "react";
import * as configApi from "../helpers/configApi";

export type ThemeMode  = "light" | "dark";
export type LocaleCode = "en" | "ua";

export interface AppConfig {
  theme: ThemeMode;
  setTheme(t: ThemeMode): void;

  locale: LocaleCode;
  setLocale(l: LocaleCode): void;

  currentDoctor: string | null;
  setCurrentDoctor(u: string | null): void;

  doctors: string[];
  addDoctor(u: string): void;
}

export const AppConfigContext = createContext<AppConfig>(null!);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /* ------------ state ------------ */
  const [theme, setTheme]                 = useState<ThemeMode>("light");
  const [locale, setLocale]               = useState<LocaleCode>("en");
  const [doctors, setDoctors]             = useState<string[]>([]);
  const [currentDoctor, setCurrentDoctor] = useState<string | null>(null);

  const [loaded, setLoaded]               = useState(false);      // ← flag

  /* ------------ initial load ------ */
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
      setLoaded(true);                       // now safe to persist
    })();
  }, []);

  /* ------------ persist AFTER load */
  useEffect(() => {
    if (!loaded) return;
    configApi.setSettings({ theme, locale });           // one call
  }, [loaded, theme, locale]);

  useEffect(() => {
    if (!loaded) return;
    configApi.setSession({ currentDoctor });
  }, [loaded, currentDoctor]);

  /* ------------ dictionary helper */
  const addDoctor = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || doctors.includes(trimmed)) return;
    await configApi.addDictionaryEntry("doctors", trimmed);
    setDoctors((prev) => [...prev, trimmed]);
  };

  /* ------------ context value ---- */
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
