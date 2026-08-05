import type { FeatureGroupSettings } from './features/types';

export interface QuickEditingSettings {
  isBT: boolean;
  isShowNum: boolean;
  linkWords: string;
  maxScroll: number;
  maxTry: number;
  version: string;
  hColor: string;
  bColor: string;
  hColor1: string;
  hColor2: string;
  hColor3: string;
  hColor4: string;
  hColor5: string;
  bColor1: string;
  bColor2: string;
  bColor3: string;
  bColor4: string;
  bColor5: string;
  isTab: boolean;
  twoEnter: boolean;
  featureGroups: FeatureGroupSettings;
  commandEnabled: Record<string, boolean>;
  smartPasteOnPaste: boolean;
  previewFullDocumentChanges: boolean;
}

export const DEFAULT_SETTINGS: QuickEditingSettings = {
  isBT: false,
  isShowNum: false,
  linkWords: '',
  maxScroll: 50,
  maxTry: 1_000,
  version: '',
  hColor: '',
  bColor: '',
  hColor1: '#F36208',
  hColor2: '#81B300',
  hColor3: '#2485E3',
  hColor4: '#C32E94',
  hColor5: '#13C6C3',
  bColor1: '#FFB78B',
  bColor2: '#CDF469',
  bColor3: '#A0CCF6',
  bColor4: '#F0A7D8',
  bColor5: '#ADEFEF',
  isTab: false,
  twoEnter: false,
  featureGroups: {
    smartSymbols: true,
    formatBrush: true,
    smartPaste: true,
    fullDocumentCleanup: true,
  },
  commandEnabled: {},
  smartPasteOnPaste: true,
  previewFullDocumentChanges: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function boundedStep(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  step: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(maximum, Math.max(minimum, value));
  return Math.round(clamped / step) * step;
}

function colorValue(value: unknown, fallback: string, allowEmpty = false): string {
  if (allowEmpty && value === '') return '';
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function booleanRecord(value: unknown): Record<string, boolean> {
  const input = asRecord(value);
  return Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
}

function featureGroupValue(value: unknown): FeatureGroupSettings {
  const input = asRecord(value);
  return {
    smartSymbols: booleanValue(input.smartSymbols, DEFAULT_SETTINGS.featureGroups.smartSymbols),
    formatBrush: booleanValue(input.formatBrush, DEFAULT_SETTINGS.featureGroups.formatBrush),
    smartPaste: booleanValue(input.smartPaste, DEFAULT_SETTINGS.featureGroups.smartPaste),
    fullDocumentCleanup: booleanValue(
      input.fullDocumentCleanup,
      DEFAULT_SETTINGS.featureGroups.fullDocumentCleanup,
    ),
  };
}

export function sanitizeSettings(value: unknown): QuickEditingSettings {
  const input = asRecord(value);
  return {
    isBT: booleanValue(input.isBT, DEFAULT_SETTINGS.isBT),
    isShowNum: booleanValue(input.isShowNum, DEFAULT_SETTINGS.isShowNum),
    linkWords: stringValue(input.linkWords, DEFAULT_SETTINGS.linkWords),
    maxScroll: boundedStep(input.maxScroll, DEFAULT_SETTINGS.maxScroll, 25, 900, 25),
    maxTry: boundedStep(input.maxTry, DEFAULT_SETTINGS.maxTry, 100, 10_000, 100),
    version: stringValue(input.version, DEFAULT_SETTINGS.version),
    hColor: colorValue(input.hColor, DEFAULT_SETTINGS.hColor, true),
    bColor: colorValue(input.bColor, DEFAULT_SETTINGS.bColor, true),
    hColor1: colorValue(input.hColor1, DEFAULT_SETTINGS.hColor1),
    hColor2: colorValue(input.hColor2, DEFAULT_SETTINGS.hColor2),
    hColor3: colorValue(input.hColor3, DEFAULT_SETTINGS.hColor3),
    hColor4: colorValue(input.hColor4, DEFAULT_SETTINGS.hColor4),
    hColor5: colorValue(input.hColor5, DEFAULT_SETTINGS.hColor5),
    bColor1: colorValue(input.bColor1, DEFAULT_SETTINGS.bColor1),
    bColor2: colorValue(input.bColor2, DEFAULT_SETTINGS.bColor2),
    bColor3: colorValue(input.bColor3, DEFAULT_SETTINGS.bColor3),
    bColor4: colorValue(input.bColor4, DEFAULT_SETTINGS.bColor4),
    bColor5: colorValue(input.bColor5, DEFAULT_SETTINGS.bColor5),
    isTab: booleanValue(input.isTab, DEFAULT_SETTINGS.isTab),
    twoEnter: booleanValue(input.twoEnter, DEFAULT_SETTINGS.twoEnter),
    featureGroups: featureGroupValue(input.featureGroups),
    commandEnabled: booleanRecord(input.commandEnabled),
    smartPasteOnPaste: booleanValue(
      input.smartPasteOnPaste,
      DEFAULT_SETTINGS.smartPasteOnPaste,
    ),
    previewFullDocumentChanges: booleanValue(
      input.previewFullDocumentChanges,
      DEFAULT_SETTINGS.previewFullDocumentChanges,
    ),
  };
}
