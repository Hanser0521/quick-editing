export type MarkdownModeNotice =
  | 'Now: Source Mode'
  | 'Now: Live Preview'
  | 'Now: Reading Mode';

export interface MarkdownModeTransition {
  state: Record<string, unknown>;
  notice: MarkdownModeNotice;
}

export function nextMarkdownMode(
  currentState: Record<string, unknown> | undefined,
): MarkdownModeTransition {
  const state = currentState ?? {};

  if (state.mode === 'preview') {
    return {
      state: { ...state, mode: 'source', source: true },
      notice: 'Now: Source Mode',
    };
  }

  if (state.mode === 'source' && state.source === true) {
    return {
      state: { ...state, mode: 'source', source: false },
      notice: 'Now: Live Preview',
    };
  }

  if (state.mode === 'source') {
    return {
      state: { ...state, mode: 'preview', source: false },
      notice: 'Now: Reading Mode',
    };
  }

  return {
    state: { ...state, mode: 'source', source: false },
    notice: 'Now: Live Preview',
  };
}
