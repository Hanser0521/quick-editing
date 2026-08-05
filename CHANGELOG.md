# Changelog

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
- Adopted a single MIT License after written authorization for the later
  historical implementation; preserved upstream and contributor attribution.
