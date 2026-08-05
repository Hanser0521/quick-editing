import assert from 'node:assert/strict';
import test from 'node:test';
import type { TFile } from 'obsidian';

import {
  convertInternalLinkSelection,
  generateResolvedInternalLink,
  type InternalLinkServices,
} from '../src/obsidian/internal-links.ts';

const file = { path: '资料/目标.md', basename: '目标' } as TFile;
const services: InternalLinkServices = {
  resolveLink: (linkpath) => linkpath === '目标' ? file : null,
  resolveAlias: (alias) => alias === '别名' ? file : null,
  generateLink: (target, sourcePath, subpath, alias) =>
    `generated:${target.path}:${sourcePath}:${subpath}:${alias}`,
};

test('delegates resolved paths, headings and aliases to generateMarkdownLink adapter', () => {
  assert.equal(
    generateResolvedInternalLink('目标#章节', '日记/今天.md', services),
    'generated:资料/目标.md:日记/今天.md:#章节:',
  );
  assert.equal(
    generateResolvedInternalLink('别名', '日记/今天.md', services),
    'generated:资料/目标.md:日记/今天.md::别名',
  );
});

test('unwraps existing wiki links and converts newline or ideographic-comma lists', () => {
  assert.equal(generateResolvedInternalLink('[[目标#章节|显示]]', '', services), '显示');
  assert.equal(
    convertInternalLinkSelection('目标、未知\r\n别名', '源.md', services),
    'generated:资料/目标.md:源.md::、[[未知]]\r\ngenerated:资料/目标.md:源.md::别名',
  );
});
