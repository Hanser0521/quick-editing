const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

class Plugin {}
class PluginSettingTab {}

const obsidian = new Proxy(
  { Plugin, PluginSettingTab, getLanguage: () => 'en' },
  {
    get(target, property) {
      return property in target ? target[property] : function MockObsidianApi() {};
    },
  },
);

const pluginModule = { exports: {} };
const bundle = fs.readFileSync('main.js', 'utf8');
const { document, window } = parseHTML('<!doctype html><html><body></body></html>');
vm.runInNewContext(bundle, {
  console,
  document,
  window,
  activeDocument: document,
  activeWindow: window,
  module: pluginModule,
  exports: pluginModule.exports,
  require(id) {
    if (id === 'obsidian') return obsidian;
    throw new Error(`Unexpected external dependency: ${id}`);
  },
});

assert.equal(typeof pluginModule.exports.default, 'function');
assert.equal(
  Object.getPrototypeOf(pluginModule.exports.default.prototype),
  Plugin.prototype,
);
console.log('main.js exports a loadable Obsidian Plugin class');
