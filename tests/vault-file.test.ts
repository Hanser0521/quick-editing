import assert from 'node:assert/strict';
import test from 'node:test';
import type { TExternalFile, TFile } from 'obsidian';
import { isVaultNote } from '../src/obsidian/vault-file.ts';

test('accepts actual vault files, not missing or stale files', () => {
  const file = { path: 'folder/note.md' } as TFile;
  assert.equal(isVaultNote(file, { getFileByPath: () => file }), true);
  assert.equal(isVaultNote(file, { getFileByPath: () => null }), false);
  assert.equal(isVaultNote(null, { getFileByPath: () => file }), false);
});

test('rejects external paths even when Vault resolves them, including pre-1.14.4 hosts', () => {
  for (const path of ['file:/private/tmp/note.md', 'file:///C:/note.md', '/tmp/note.md', 'C:\\note.md']) {
    const file = { path } as TFile;
    assert.equal(isVaultNote(file, { getFileByPath: () => file }), false);
  }
});

test('prefers the public TExternalFile identity when available', () => {
  class ExternalFile { path = 'unexpected-relative-path.md'; }
  const file = new ExternalFile() as unknown as TFile;
  assert.equal(isVaultNote(file, { getFileByPath: () => file }, ExternalFile as unknown as typeof TExternalFile), false);
});
