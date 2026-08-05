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
