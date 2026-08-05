import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertWindowsPathSyntax,
  fileUrlToWindowsPath,
  isWindowsPath,
  windowsPathToFileUrl,
} from '../src/utils/windows-path.ts';

test('encodes drive paths as durable file URLs', () => {
  assert.equal(
    windowsPathToFileUrl('c:\\资料\\A #1 (终稿).pdf'),
    'file:///C:/%E8%B5%84%E6%96%99/A%20%231%20%28%E7%BB%88%E7%A8%BF%29.pdf',
  );
  assert.equal(
    convertWindowsPathSyntax('c:\\资料\\A #1 (终稿).pdf'),
    '[file](file:///C:/%E8%B5%84%E6%96%99/A%20%231%20%28%E7%BB%88%E7%A8%BF%29.pdf)',
  );
});

test('round-trips file URLs and Markdown links to Windows paths', () => {
  assert.equal(
    fileUrlToWindowsPath('file:///C:/My%20Notes/a.md'),
    'C:\\My Notes\\a.md',
  );
  assert.equal(
    convertWindowsPathSyntax('[笔记](file:///C:/My%20Notes/a.md)'),
    'C:\\My Notes\\a.md',
  );
  assert.equal(convertWindowsPathSyntax('[旧链接](C:\\Notes\\a.md)'), 'C:\\Notes\\a.md');
});

test('supports UNC network paths and rejects unrelated content', () => {
  assert.equal(windowsPathToFileUrl('\\\\server\\share\\a b.md'), 'file://server/share/a%20b.md');
  assert.equal(fileUrlToWindowsPath('file://server/share/a%20b.md'), '\\\\server\\share\\a b.md');
  assert.equal(isWindowsPath('not:a:path'), false);
  assert.equal(convertWindowsPathSyntax('https://example.com'), null);
});
