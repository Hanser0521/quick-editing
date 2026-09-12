import { enCommandNames, enMessages } from './locales/en.ts';
import { zhCnMessages } from './locales/zh-cn.ts';

export type MessageKey = keyof typeof enMessages;
export type TranslationVariables = Record<string, string | number>;
export type QuickEditingLocale = 'en' | 'zh-cn';

const bundles: Record<QuickEditingLocale, Record<MessageKey, string>> = {
  en: enMessages,
  'zh-cn': zhCnMessages,
};

export function resolveQuickEditingLocale(language: string): QuickEditingLocale {
  return language.toLocaleLowerCase().startsWith('zh') ? 'zh-cn' : 'en';
}

export function translate(
  key: MessageKey,
  variables: TranslationVariables = {},
  locale: QuickEditingLocale = 'en',
): string {
  const template = bundles[locale][key] ?? enMessages[key];
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, name: string) => {
    const value = variables[name];
    return value === undefined ? match : String(value);
  });
}

export function localizeCommandNameForLocale(
  commandId: string,
  zhCnFallback: string,
  locale: QuickEditingLocale,
): string {
  if (locale === 'zh-cn') return zhCnFallback;
  return enCommandNames[commandId] ?? zhCnFallback;
}

export function commandSearchNames(commandId: string, zhCnName: string): string[] {
  return Array.from(new Set([zhCnName, enCommandNames[commandId] ?? zhCnName]));
}

export function hasEnglishCommandName(commandId: string): boolean {
  return Object.prototype.hasOwnProperty.call(enCommandNames, commandId);
}
