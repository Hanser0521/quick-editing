import assert from 'node:assert/strict';
import test from 'node:test';
import type { App } from 'obsidian';

import { executeCoreCommand } from '../src/obsidian/command-compat.ts';

function fakeApp(value: unknown): App {
  return value as App;
}

test('returns false when the internal command manager is unavailable', () => {
  assert.equal(executeCoreCommand(fakeApp({}), 'app:open-settings'), false);
});

test('accepts boolean and legacy void command results', () => {
  assert.equal(executeCoreCommand(fakeApp({
    commands: { executeCommandById: () => true },
  }), 'app:open-settings'), true);
  assert.equal(executeCoreCommand(fakeApp({
    commands: { executeCommandById: () => undefined },
  }), 'app:open-settings'), true);
  assert.equal(executeCoreCommand(fakeApp({
    commands: { executeCommandById: () => false },
  }), 'missing-command'), false);
});

test('contains command manager failures at the compatibility boundary', () => {
  assert.equal(executeCoreCommand(fakeApp({
    commands: { executeCommandById: () => { throw new Error('failed'); } },
  }), 'app:open-settings'), false);
});

test('rejects commands outside the documented compatibility boundary', () => {
  assert.equal(executeCoreCommand(fakeApp({
    commands: { executeCommandById: () => true },
  }), 'workspace:split-vertical'), false);
});
