
'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback, useMemo } from 'react';

export type Language = 'en' | 'ms' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  getTranslated: (item: any, field: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'pasargo-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    try {
      const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (storedLanguage && ['en', 'ms', 'th'].includes(storedLanguage)) {
        setLanguage(storedLanguage);
      }
    } catch (error) {
      console.error("Failed to load language from localStorage", error);
    }
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error)      {
        console.error("Failed to save language to localStorage", error);
    }
  }, []);
  
  const getTranslated = useCallback((item: any, field: string): string => {
    if (!item) return '';
    const baseField = item[field]; // e.g., item['name']
    if (language === 'en') {
      return baseField || '';
    }
    const translatedField = item[`${field}_${language}`]; // e.g., item['name_th']
    return translatedField || baseField || '';
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    getTranslated,
  }), [language, handleSetLanguage, getTranslated]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
