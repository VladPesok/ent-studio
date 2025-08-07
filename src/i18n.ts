import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Відео матеріали': 'Video Materials',
      'Голосовий звіт': 'Voice Report'
    }
  },
  ua: {
    translation: {
      'Відео матеріали': 'Відео матеріали',
      'Голосовий звіт': 'Голосовий звіт'
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