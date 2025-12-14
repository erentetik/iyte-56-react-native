import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import enTranslations from '../locales/en.json';
import trTranslations from '../locales/tr.json';

// Get device language - fallback to 'en' if expo-localization is not available
function getDeviceLanguage(): string {
  try {
    // Try to use expo-localization if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization');
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const languageCode = locales[0].languageCode || 'en';
      return languageCode.startsWith('tr') ? 'tr' : 'en';
    }
  } catch {
    // Fallback if expo-localization is not installed
  }
  return 'en';
}

export type Language = 'en' | 'tr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'app_language';

const translations = {
  en: enTranslations,
  tr: trTranslations,
};

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Return the key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load saved language or detect from device
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'tr')) {
          setLanguageState(savedLanguage as Language);
        } else {
          // Detect device language
          const detectedLanguage = getDeviceLanguage();
          setLanguageState(detectedLanguage as Language);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detectedLanguage);
        }
      } catch (error) {
        console.error('Error loading language:', error);
        // Default to English on error
        setLanguageState('en');
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    const translation = translations[language];
    return getNestedValue(translation, key);
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
