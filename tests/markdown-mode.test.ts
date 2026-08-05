import assert from 'node:assert/strict';
import test from 'node:test';

import { nextMarkdownMode } from '../src/editor/markdown-mode.ts';

test('cycles reading, source, and live preview modes without mutating input', () => {
  const reading = { mode: 'preview', custom: 'preserved' };
  const source = nextMarkdownMode(reading);

  assert.deepEqual(reading, { mode: 'preview', custom: 'preserved' });
  assert.deepEqual(source, {
    state: { mode: 'source', source: true, custom: 'preserved' },
    notice: 'Now: Source Mode',
  });

  const live = nextMarkdownMode(source.state);
  assert.deepEqual(live, {
    state: { mode: 'source', source: false, custom: 'preserved' },
    notice: 'Now: Live Preview',
  });

  assert.deepEqual(nextMarkdownMode(live.state), {
    state: { mode: 'preview', source: false, custom: 'preserved' },
    notice: 'Now: Reading Mode',
  });
});

test('recovers an absent or unknown state as live preview', () => {
  assert.deepEqual(nextMarkdownMode(undefined), {
    state: { mode: 'source', source: false },
    notice: 'Now: Live Preview',
  });
  assert.deepEqual(nextMarkdownMode({ mode: 'unknown', custom: 1 }), {
    state: { mode: 'source', source: false, custom: 1 },
    notice: 'Now: Live Preview',
  });
});
