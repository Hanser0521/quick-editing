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
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'obsidianmd/ui/sentence-case': [
        'warn',
        {
          enforceCamelCaseLower: true,
          brands: ['Quick Editing', 'Office'],
        },
      ],
    },
  },
);
