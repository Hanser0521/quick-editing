# Changelog

## Unreleased

## 1.0.5 - 2026-09-12

- Added complete English localization using Obsidian's official `getLanguage()`
  API, with Simplified Chinese for Chinese language variants and English as the
  fallback for all other locales.
- Localized all 101 command names, menus, settings, transformation previews,
  notices, arithmetic errors, and generated smart-paste/image labels while
  retaining bilingual command search.
- Added declarative setting definitions for Obsidian 1.13 and later so Quick
  Editing settings participate in global Settings search, while preserving the
  classic settings page for older supported Obsidian versions.
- Upgraded the official Obsidian ESLint plugin and enabled its English-locale
  validation rules in release checks.
- Added tests for locale selection, interpolation, localized generated content,
  and arithmetic error codes, plus a release guard requiring exact English-name
  coverage for every active command.
- Updated vulnerable indirect development dependencies to patched versions;
  both the full and production-only npm audits now report zero known
  vulnerabilities.

## 1.0.4 - 2026-08-06

- Show each configured text color and highlighter color as an inline swatch in
  the status bar format-brush menu, including themes that hide menu icons.
- Keep the format-brush picker in Obsidian's DOM menu when macOS native menus
  are enabled, because native menus cannot render plugin colors or HTML.
- Added the official Obsidian ESLint rules to the release checks and made every
  warning fail CI so scanner regressions cannot silently return.
- Removed legacy `var` declarations, unnecessary regular-expression escapes,
  obsolete variables and SVG constants, and other dead code reported by the
  community scanner.
- Hardened clipboard writes, smart-paste event handling, alias metadata type
  checks, and multi-window undo notices.
- Added a contributor guide with the supported setup and verification process.

## 1.0.3 - 2026-08-05

- Removed version-by-version release notes from the README overview so the
  public plugin page stays focused on stable features, usage, installation, and
  licensing information.
- Kept release history in this changelog and updated the Obsidian Community
  short description to English.

## 1.0.2 - 2026-08-05

- Replaced release-notice `innerHTML` writes with safe DOM construction.
- Updated the manifest description and author URL for the current Obsidian
  community plugin requirements.
- Added concise English installation, usage, privacy, and permission
  documentation for community review.
- Removed the optional ZIP archive from GitHub Releases so each release contains
  only `main.js`, `manifest.json`, and `styles.css`.
- Removed a deprecated slider tooltip call and simplified two empty conditional
  branches reported by automated review.

## 1.0.1 - 2026-08-05

- Removed all plugin-provided default hotkeys to comply with the current
  Obsidian community plugin guidelines. Users can assign any command in
  Obsidian's Hotkeys settings.
- Removed production debug logging and replaced the hard-coded settings-page
  heading element with a plugin-scoped styled title.
- Stopped tracking the generated `main.js` bundle in the source branch. Release
  assets continue to be built and attached by GitHub Actions.
- Added signed GitHub artifact attestations for all release assets.
- Added a release check that rejects commands with default hotkeys.

## 1.0.0 - 2026-08-05

- Renamed the plugin and repository to Quick Editing with the new
  `quick-editing` plugin ID.
- Reworked Markdown transformations around syntax-tree context protection for
  Frontmatter, code, math, HTML, links, images, and Obsidian comments.
- Added transformation previews, estimated change counts, and undo notices.
- Rebuilt smart paste around `ClipboardEvent`, DOM-based HTML conversion, and
  Office/HTML table parsing.
- Reworked internal-link generation around `MetadataCache` and
  `FileManager.generateMarkdownLink()`.
- Split smart symbols, format brushes, smart paste, and full-document cleanup
  into independently configurable feature groups.
- Added command search, per-command switches, multi-window support, and a
  redesigned settings page.
- Removed commands already implemented more completely by Obsidian core.
- Added one-click removal of Markdown, Obsidian, reference-style, and HTML
  image links without deleting attachment files.
- Added TypeScript validation, unit tests, production builds, bundle smoke
  tests, and automated GitHub releases.
- Adopted a single MIT License after the upstream owner explicitly authorized
  publication in public GitHub Issue #93; preserved upstream and contributor
  attribution.
