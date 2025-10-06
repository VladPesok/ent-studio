import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'video': 'Video Materials',
      'audio': 'Voice Report',
      'tests': 'Tests',
      'testTypes': {
        'handicapIndex': 'Handicap Index Test'
      }
    }
  },
  ua: {
    translation: {
      'video': 'Відео матеріали',
      'audio': 'Голосовий звіт',
      'tests': 'Тести',
      'testTypes': {
        'handicapIndex': 'Тест індексу обмежень'
      }
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