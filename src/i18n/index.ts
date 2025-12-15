import { en, type Translations } from './en';
import { es } from './es';
import { fr } from './fr';
import { ru } from './ru';
import { de } from './de';
import { pt } from './pt';
import { zh } from './zh';
import { ja } from './ja';

export type Language = 'en' | 'es' | 'fr' | 'ru' | 'de' | 'pt' | 'zh' | 'ja';

export const translations: Record<Language, Translations> = {
  en,
  es,
  fr,
  ru,
  de,
  pt,
  zh,
  ja,
};

export const languageFlags: Record<Language, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  ru: '🇷🇺',
  de: '🇩🇪',
  pt: '🇧🇷',
  zh: '🇨🇳',
  ja: '🇯🇵',
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ru: 'Русский',
  de: 'Deutsch',
  pt: 'Português',
  zh: '中文',
  ja: '日本語',
};

export type { Translations };
