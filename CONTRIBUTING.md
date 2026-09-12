# Contributing to Quick Editing

Thank you for helping improve Quick Editing. Please keep changes focused and
compatible with Obsidian's public plugin API.

## Development setup

Quick Editing requires Node.js 22 or newer.

```bash
npm ci
npm run check
```

Edit TypeScript under `src/`. The generated `main.js` bundle is a release
artifact and must not be committed.

## Pull requests

- Keep each pull request focused on one problem.
- Add or update unit tests for pure text transformations.
- Preserve protected Markdown contexts such as frontmatter, code, math, links,
  images, HTML, and Obsidian comments.
- Put user-visible text behind locale keys and update both the English and
  Simplified Chinese locale bundles.
- Use Obsidian's public APIs and multi-window-safe document references.
- Do not register default hotkeys; users assign shortcuts in Obsidian settings.
- Run `npm run check` before submitting.

Maintainers handle versioning, tags, and GitHub Releases after a change passes
review and the full release check.
