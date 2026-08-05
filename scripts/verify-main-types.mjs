import assert from 'node:assert/strict';
import ts from 'typescript';

const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
assert.ok(configPath, 'tsconfig.json was not found');

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(configFile.error, undefined, 'tsconfig.json could not be read');

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, '.');
const mainPath = ts.sys.resolvePath('src/main.ts');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program).filter(
  (diagnostic) => diagnostic.file && ts.sys.resolvePath(diagnostic.file.fileName) === mainPath,
);

const formatDiagnostic = (diagnostic) => {
  const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  const location = position ? `${position.line + 1}:${position.character + 1}` : 'unknown';
  return `${location} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
};

assert.deepEqual(
  diagnostics.map(formatDiagnostic),
  [],
  'type diagnostics remain in src/main.ts',
);

console.log('verified zero type diagnostics in src/main.ts');
