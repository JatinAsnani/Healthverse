import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './translations.js';

const savedLang = localStorage.getItem('healthverse_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export function changeLanguage(lang) {
  i18n.changeLanguage(lang);
  localStorage.setItem('healthverse_language', lang);
}

export default i18n;
