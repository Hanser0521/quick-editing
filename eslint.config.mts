import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...obsidianmd.configs.recommendedWithLocalesEn,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      'obsidianmd/ui/sentence-case': [
        'warn',
        {
          enforceCamelCaseLower: true,
          brands: ['Quick Editing', 'Obsidian', 'Office', 'Markdown', 'Mermaid', 'GitHub', 'Latin', 'Chinese', 'English'],
          acronyms: ['API', 'CJK', 'DOM', 'HTML', 'ID', 'URL'],
        },
      ],
      'obsidianmd/ui/sentence-case-locale-module': [
        'warn',
        {
          enforceCamelCaseLower: true,
          brands: ['Quick Editing', 'Obsidian', 'Office', 'Markdown', 'Mermaid', 'GitHub', 'Latin', 'Chinese', 'English'],
          acronyms: ['API', 'CJK', 'DOM', 'HTML', 'ID', 'URL'],
          ignoreRegex: ['^\\d', '^[*_~=]'],
        },
      ],
    },
  },
);
