import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
const source = fs.readFileSync('src/main.ts', 'utf8');
const sourceFiles = fs.readdirSync('src', { recursive: true })
  .filter((file) => typeof file === 'string' && file.endsWith('.ts'));
const uncheckedFiles = sourceFiles.filter((file) =>
  fs.readFileSync(`src/${file}`, 'utf8').startsWith('// @ts-nocheck'),
);

assert.equal(packageJson.version, manifest.version, 'package and manifest versions differ');
assert.equal(packageJson.name, manifest.id, 'package name and plugin ID differ');
assert.equal(packageJson.license, 'MIT', 'package must declare the repository MIT license');
assert.equal(
  JSON.parse(fs.readFileSync('package-lock.json', 'utf8')).packages[''].license,
  packageJson.license,
  'package and lockfile licenses differ',
);
assert.match(fs.readFileSync('LICENSE', 'utf8'), /^MIT License\n/, 'LICENSE must contain MIT text');
assert.match(
  fs.readFileSync('NOTICE', 'utf8'),
  /written authorization from obsidian-canzi/,
  'NOTICE must preserve the written authorization record',
);
assert.match(manifest.id, /^[a-z0-9-]+$/, 'plugin ID must use lowercase letters, numbers, and hyphens');
assert.equal(manifest.id.includes('obsidian'), false, 'plugin ID must not contain obsidian');
assert.equal(manifest.name, 'Quick Editing', 'unexpected plugin display name');
assert.equal(
  versions[manifest.version],
  manifest.minAppVersion,
  'versions.json does not map the current release to minAppVersion',
);

const sourceVersion = /const 当前版本 = ['"]([^'"]+)['"]/.exec(source)?.[1];
assert.equal(sourceVersion, manifest.version, 'source and manifest versions differ');

const mainSourceFile = ts.createSourceFile(
  'src/main.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const commandIds = [];
let commandCallCount = 0;
const collectCommandIds = (node) => {
  if (
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.name.text === 'addQuickCommand'
  ) {
    commandCallCount += 1;
    const command = node.arguments[0];
    if (command && ts.isObjectLiteralExpression(command)) {
      const idProperty = command.properties.find(
        (property) => ts.isPropertyAssignment(property)
          && ts.isIdentifier(property.name)
          && property.name.text === 'id',
      );
      if (idProperty && ts.isPropertyAssignment(idProperty) && ts.isStringLiteral(idProperty.initializer)) {
        commandIds.push(idProperty.initializer.text);
      }
    }
  }
  ts.forEachChild(node, collectCommandIds);
};
collectCommandIds(mainSourceFile);
assert.equal(commandIds.length, commandCallCount, 'every active addQuickCommand call must use a literal ID');
const coreCommandReplacements = {
  'set-mode': 'editor:toggle-source / markdown:toggle-preview',
  'tag-text': 'editor:insert-tag',
  'mouse-up': 'editor/native cursor movement',
  'mouse-down': 'editor/native cursor movement',
  'mouse-left': 'editor/native cursor movement',
  'mouse-right': 'editor/native cursor movement',
  'mouse-start': 'editor/native cursor movement',
  'mouse-end': 'editor/native cursor movement',
  'note-start': 'editor/native cursor movement',
  'note-end': 'editor/native cursor movement',
  'biaoti0-text': 'editor:set-heading-0',
  'biaoti1-text': 'editor:set-heading-1',
  'biaoti2-text': 'editor:set-heading-2',
  'biaoti3-text': 'editor:set-heading-3',
  'biaoti4-text': 'editor:set-heading-4',
  'biaoti5-text': 'editor:set-heading-5',
  'biaoti6-text': 'editor:set-heading-6',
  'cuti-text': 'editor:toggle-bold',
  'gaoliang-text': 'editor:toggle-highlight',
  'xieti-text': 'editor:toggle-italics',
  'shanchu-text': 'editor:toggle-strikethrough',
  'add-daima': 'editor:insert-codeblock',
  'add-callout': 'editor:insert-callout',
  'y2w-list': 'editor:toggle-bullet-list',
  'w2y-list': 'editor:toggle-numbered-list',
  'delete-list': 'editor:delete-paragraph',
  'copy-filePath': 'workspace:copy-path',
};
const retainedCoreDuplicates = commandIds.filter((id) => id in coreCommandReplacements);
assert.deepEqual(
  retainedCoreDuplicates,
  [],
  'commands duplicated by Obsidian core must not be registered',
);
const duplicateIds = commandIds.filter((id, index) => commandIds.indexOf(id) !== index);
assert.deepEqual(Array.from(new Set(duplicateIds)), [], 'duplicate command IDs found');
assert.deepEqual(
  uncheckedFiles,
  [],
  'source files must not opt out of type checking',
);

const bannedPatterns = [
  ['dynamic eval', /\beval\s*\(/],
  ['deprecated activeLeaf', /workspace\.activeLeaf/],
  ['private app settings', /app\.setting/],
  ['private core plugin access', /app\.internalPlugins/],
  ['private menu DOM access', /\bmenu\.dom\b/],
  ['obsolete Menu constructor argument', /new\s+obsidian\.Menu\s*\([^)]/],
  ['manual status-bar menu geometry', /statusBarIcon(?:\.parentElement)?\.getBoundingClientRect/],
  ['unmanaged document event', /document\.addEventListener/],
  ['direct adapter rename', /adapter\.rename/],
  ['selection written as full document', /替换笔记正文\s*\(\s*所选文本/],
  ['legacy temporary link marker', /⚘/],
  ['nested immediate invocation', /\(\s*\)\s*\(\s*\)/],
];
for (const [label, pattern] of bannedPatterns) {
  for (const file of sourceFiles) {
    const fileSource = fs.readFileSync(`src/${file}`, 'utf8');
    assert.equal(pattern.test(fileSource), false, `${label} found in src/${file}`);
  }
}

for (const file of sourceFiles) {
  if (file === 'obsidian/command-compat.ts') continue;
  const fileSource = fs.readFileSync(`src/${file}`, 'utf8');
  assert.equal(
    /(?:app\.commands|executeCommandById)/.test(fileSource),
    false,
    `direct command-manager access found in src/${file}`,
  );
}

console.log(
  `verified ${commandIds.length} unique commands, ${sourceFiles.length} source files, and version ${manifest.version}`,
);
