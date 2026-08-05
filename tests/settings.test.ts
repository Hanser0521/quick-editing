import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/settings.ts';

test('returns a fresh complete settings object for missing legacy data', () => {
  const settings = sanitizeSettings(null);
  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.notEqual(settings, DEFAULT_SETTINGS);
});

test('preserves valid legacy settings and fills newly introduced fields', () => {
  const settings = sanitizeSettings({
    linkWords: '甲\n乙',
    maxScroll: 125,
    maxTry: 2_500,
    hColor1: '#abcdef',
    isBT: true,
    version: '0.6.4',
  });
  assert.equal(settings.linkWords, '甲\n乙');
  assert.equal(settings.maxScroll, 125);
  assert.equal(settings.maxTry, 2_500);
  assert.equal(settings.hColor1, '#abcdef');
  assert.equal(settings.isBT, true);
  assert.equal(settings.version, '0.6.4');
  assert.equal(settings.isTab, false);
  assert.equal(settings.twoEnter, false);
  assert.deepEqual(settings.featureGroups, DEFAULT_SETTINGS.featureGroups);
  assert.deepEqual(settings.commandEnabled, {});
  assert.equal(settings.smartPasteOnPaste, true);
  assert.equal(settings.previewFullDocumentChanges, true);
});

test('repairs invalid types, colors, and numeric ranges', () => {
  const settings = sanitizeSettings({
    isBT: 1,
    linkWords: 42,
    maxScroll: 914,
    maxTry: Number.NaN,
    hColor1: 'expression(alert(1))',
    bColor2: '#123',
    isTab: 'true',
    twoEnter: true,
    featureGroups: { smartPaste: false, formatBrush: 'yes' },
    commandEnabled: { valid: false, invalid: 'no' },
  });
  assert.equal(settings.isBT, DEFAULT_SETTINGS.isBT);
  assert.equal(settings.linkWords, DEFAULT_SETTINGS.linkWords);
  assert.equal(settings.maxScroll, 900);
  assert.equal(settings.maxTry, DEFAULT_SETTINGS.maxTry);
  assert.equal(settings.hColor1, DEFAULT_SETTINGS.hColor1);
  assert.equal(settings.bColor2, DEFAULT_SETTINGS.bColor2);
  assert.equal(settings.isTab, false);
  assert.equal(settings.twoEnter, true);
  assert.equal(settings.featureGroups.smartPaste, false);
  assert.equal(settings.featureGroups.formatBrush, true);
  assert.deepEqual(settings.commandEnabled, { valid: false });
});

test('snaps slider values to their supported steps', () => {
  const settings = sanitizeSettings({ maxScroll: 61, maxTry: 1_049 });
  assert.equal(settings.maxScroll, 50);
  assert.equal(settings.maxTry, 1_000);
});
