import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeTransformation } from '../src/transformations/preview.ts';

test('summarizes no-op and multi-line transformations', () => {
  assert.deepEqual(summarizeTransformation('相同', '相同'), {
    estimatedChanges: 0,
    changedLines: 0,
    characterDelta: 0,
    beforePreview: '相同',
    afterPreview: '相同',
  });
  const summary = summarizeTransformation('一\n二\n三', '一\n改\n三\n四');
  assert.equal(summary.estimatedChanges, 2);
  assert.equal(summary.changedLines, 2);
  assert.equal(summary.characterDelta, 2);
  assert.match(summary.afterPreview, /改/);
});
