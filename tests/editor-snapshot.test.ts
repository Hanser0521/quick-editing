import assert from 'node:assert/strict';
import test from 'node:test';
import type { Editor } from 'obsidian';
import { captureEditorSnapshot, editorMatchesSnapshot } from '../src/editor/snapshot.ts';

test('asynchronous edits reject changed text or cursor positions, including reversed selections', () => {
  let value = 'note';
  const selection = { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 4 } };
  const editor = {
    getValue: () => value,
    listSelections: () => [selection],
  } as unknown as Editor;
  const snapshot = captureEditorSnapshot(editor);
  assert.equal(editorMatchesSnapshot(editor, snapshot), true);
  value = 'edit';
  assert.equal(editorMatchesSnapshot(editor, snapshot), false);
  value = 'note';
  selection.anchor.ch = 4;
  selection.head.ch = 0;
  assert.equal(editorMatchesSnapshot(editor, snapshot), false);
  assert.equal(snapshot.selections[0]?.anchor.ch, 0);
});

test('adding or moving a secondary cursor invalidates a snapshot', () => {
  const selections = [{ anchor: { line: 0, ch: 1 }, head: { line: 0, ch: 1 } }];
  const editor = { getValue: () => 'note', listSelections: () => selections } as unknown as Editor;
  const snapshot = captureEditorSnapshot(editor);
  selections.push({ anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } });
  assert.equal(editorMatchesSnapshot(editor, snapshot), false);
});
