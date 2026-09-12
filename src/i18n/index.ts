import { getLanguage } from 'obsidian';

import {
  commandSearchNames,
  hasEnglishCommandName,
  localizeCommandNameForLocale,
  resolveQuickEditingLocale,
  translate,
  type MessageKey,
  type QuickEditingLocale,
  type TranslationVariables,
} from './core';

export {
  commandSearchNames,
  hasEnglishCommandName,
  type MessageKey,
  type QuickEditingLocale,
  type TranslationVariables,
};

export function getQuickEditingLocale(language = getLanguage()): QuickEditingLocale {
  return resolveQuickEditingLocale(language);
}

export function t(
  key: MessageKey,
  variables: TranslationVariables = {},
  locale = getQuickEditingLocale(),
): string {
  return translate(key, variables, locale);
}

export function localizeCommandName(
  commandId: string,
  zhCnFallback: string,
  locale = getQuickEditingLocale(),
): string {
  return localizeCommandNameForLocale(commandId, zhCnFallback, locale);
}
