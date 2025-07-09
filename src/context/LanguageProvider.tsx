
'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import translations from '@/lib/translations';

export type Language = 'en' | 'ms' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  getTranslated: (item: any, field: string) => string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
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

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error)      {
        console.error("Failed to save language to localStorage", error);
    }
  };
  
  const getTranslated = (item: any, field: string): string => {
    if (!item) return '';
    const baseField = item[field]; // e.g., item['name']
    if (language === 'en') {
      return baseField || '';
    }
    const translatedField = item[`${field}_${language}`]; // e.g., item['name_th']
    return translatedField || baseField || '';
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations['en'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(replaceKey => {
            translation = translation.replace(`{${replaceKey}}`, String(replacements[replaceKey]));
        });
    }
    return translation;
  }, [language]);

  const value = {
    language,
    setLanguage: handleSetLanguage,
    getTranslated,
    t,
  };

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
