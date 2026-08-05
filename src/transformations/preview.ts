export interface TransformationSummary {
  estimatedChanges: number;
  changedLines: number;
  characterDelta: number;
  beforePreview: string;
  afterPreview: string;
}

function previewAroundFirstChange(before: string, after: string): [string, string] {
  let prefix = 0;
  const shortest = Math.min(before.length, after.length);
  while (prefix < shortest && before[prefix] === after[prefix]) prefix += 1;

  const radius = 180;
  const from = Math.max(0, prefix - radius);
  const beforeSlice = before.slice(from, prefix + radius);
  const afterSlice = after.slice(from, prefix + radius);
  const beforePreview = `${from > 0 ? '…' : ''}${beforeSlice}${prefix + radius < before.length ? '…' : ''}`;
  const afterPreview = `${from > 0 ? '…' : ''}${afterSlice}${prefix + radius < after.length ? '…' : ''}`;
  return [beforePreview, afterPreview];
}

function changedLineEstimate(before: string, after: string): number {
  const beforeLines = before.replace(/\r\n?/g, '\n').split('\n');
  const afterLines = after.replace(/\r\n?/g, '\n').split('\n');
  const length = Math.max(beforeLines.length, afterLines.length);
  let changed = 0;
  for (let index = 0; index < length; index += 1) {
    if (beforeLines[index] !== afterLines[index]) changed += 1;
  }
  return changed;
}

export function summarizeTransformation(before: string, after: string): TransformationSummary {
  if (before === after) {
    return {
      estimatedChanges: 0,
      changedLines: 0,
      characterDelta: 0,
      beforePreview: before.slice(0, 360),
      afterPreview: after.slice(0, 360),
    };
  }
  const changedLines = changedLineEstimate(before, after);
  const [beforePreview, afterPreview] = previewAroundFirstChange(before, after);
  return {
    estimatedChanges: Math.max(1, changedLines),
    changedLines,
    characterDelta: after.length - before.length,
    beforePreview,
    afterPreview,
  };
}
