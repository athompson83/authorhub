# ADR-0001: Structured Canonical Manuscript with Stable Block IDs

## Status
Accepted

## Context
AuthorHub must support large manuscripts, chapter-scoped editing, comments, claims, citations, AI provenance, snapshots, and multiple publication formats. A single opaque book blob or format-specific copies would make durable references and reliable exports fragile.

## Decision
Store manuscript hierarchy as ordered structural nodes. Each editable node contains versioned semantic document JSON compatible with the editor. Addressable blocks carry stable IDs that survive ordinary edits. Claims, citations, comments, suggestions, and provenance reference those block identities plus resilient range anchors where needed.

## Alternatives considered
- One giant rich-text/document blob per book
- Markdown files as the canonical source
- Separate canonical source per export format
- Fully normalized paragraph/inline relational model

## Consequences
- Chapter-level editing remains performant for long books.
- Evidence and comments can survive routine text changes more reliably.
- All renderers can consume one semantic source.
- The application must maintain document-schema migrations and block-ID integrity.
- Derived block/search indexes must never become a second editable truth.
