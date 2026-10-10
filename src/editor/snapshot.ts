import type { Editor, EditorSelection } from 'obsidian';

export interface EditorSnapshot {
  value: string;
  selections: EditorSelection[];
}

/** Capture positions too: an asynchronous paste must not follow a moved cursor. */
export function captureEditorSnapshot(editor: Editor): EditorSnapshot {
  return {
    value: editor.getValue(),
    selections: editor.listSelections().map(({ anchor, head }) => ({
      anchor: { ...anchor },
      head: { ...head },
    })),
  };
}

export function editorMatchesSnapshot(editor: Editor, snapshot: EditorSnapshot): boolean {
  if (editor.getValue() !== snapshot.value) return false;
  const selections = editor.listSelections();
  return selections.length === snapshot.selections.length && selections.every((selection, index) => {
    const expected = snapshot.selections[index];
    return expected !== undefined
      && selection.anchor.line === expected.anchor.line
      && selection.anchor.ch === expected.anchor.ch
      && selection.head.line === expected.head.line
      && selection.head.ch === expected.head.ch;
  });
}
