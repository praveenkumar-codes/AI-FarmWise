import React, { createContext, useContext, useState } from 'react';
import { en } from '../i18n/en.js';
import { te } from '../i18n/te.js';
import { hi } from '../i18n/hi.js';

const DICTIONARIES = { en, te, hi };

export const LANGUAGES = [
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
];

const LanguageContext = createContext({
  lang: 'te',
  setLang: () => {},
  t: te,
  languages: LANGUAGES,
});

export function LanguageProvider({ children }) {
  // Default language set to Telugu ('te') for the Farmer-first experience
  const [lang, setLang] = useState('te');
  const t = DICTIONARIES[lang] || te;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
