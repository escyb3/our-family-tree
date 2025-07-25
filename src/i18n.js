// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationHE from './locales/he/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  he: { translation: translationHE },
  en: { translation: translationEN },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'he',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
