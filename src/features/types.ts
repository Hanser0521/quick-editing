export type FeatureGroupKey =
  | 'smartSymbols'
  | 'formatBrush'
  | 'smartPaste'
  | 'fullDocumentCleanup';

export type FeatureGroupSettings = Record<FeatureGroupKey, boolean>;
