# Changelog

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
