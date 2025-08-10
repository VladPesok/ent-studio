import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'video': 'Video Materials',
      'audio': 'Voice Report'
    }
  },
  ua: {
    translation: {
      'video': 'Відео матеріали',
      'audio': 'Голосовий звіт'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ua',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;