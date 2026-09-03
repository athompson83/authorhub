<div align="center">

# AuthorHub

**A structured author operating system for taking a book from source material to publication readiness.**

![Stage](https://img.shields.io/badge/stage-foundation-7C3AED?style=flat-square)
![Focus](https://img.shields.io/badge/focus-source--grounded%20nonfiction-7C3AED?style=flat-square)
![Path](https://img.shields.io/badge/path-MVP%20%E2%86%92%20Beta%20%E2%86%92%20Production-7C3AED?style=flat-square)

</div>

> [!NOTE]
> AuthorHub is currently documentation-first. Product, architecture, security, data, AI, export, UX, and delivery specifications are being established before application code is introduced.

## Product thesis

Authors do not need another blank text editor. They need a governed project workspace that keeps research, outlines, chapters, evidence, revisions, editorial decisions, publishing metadata, and final formats connected throughout the life of a book.

The initial market wedge is **source-grounded nonfiction**. The manuscript and publishing model is intentionally genre-neutral so fiction, textbooks, manuals, and collaborative publishing can be added later without replacing the core architecture.

## North-star workflow

```text
Create book → Define audience and purpose → Import sources → Build outline
→ Draft chapters → Review with AI and humans → Verify claims and citations
→ Freeze manuscript → Generate DOCX / EPUB / PDF → Complete publishing metadata
→ Reach publication readiness
```

## Planned product pillars

| Pillar | Outcome |
| --- | --- |
| Structured writing | Books, parts, chapters, sections, notes, and source material stay organized |
| Evidence | Claims, citations, annotations, and supporting sources remain traceable |
| Version control | Authors can review and restore meaningful manuscript history |
| Governed AI | AI can draft, edit, critique, and fact-check without becoming the source of truth |
| Professional export | One canonical manuscript can produce DOCX, EPUB, and PDF outputs |
| Publishing readiness | Metadata, cover, sizing, identifiers, and release tasks become a guided workflow |

## Planned technical baseline

- Next.js, React, and TypeScript
- PostgreSQL/Supabase with Auth and Storage
- TipTap/ProseMirror for structured editing
- pgvector for grounded semantic retrieval
- Provider-neutral AI orchestration
- Background jobs for source ingestion, AI work, exports, and publishing tasks
- Vercel for web delivery with dedicated workers/renderers where needed

## Documentation map

| Document | Purpose |
| --- | --- |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product scope and requirements |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design and package boundaries |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Canonical data model and tenancy |
| [`docs/AI.md`](docs/AI.md) | AI orchestration, provenance, and safety |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security and intellectual-property controls |
| [`docs/EXPORTS.md`](docs/EXPORTS.md) | Manuscript rendering and publication formats |
| [`docs/UX.md`](docs/UX.md) | Information architecture and workflows |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | MVP → Beta → Production plan |
| [`docs/TESTING.md`](docs/TESTING.md) | Quality and release gates |
| [`AGENTS.md`](AGENTS.md) | Repository rules for coding agents |

## Non-negotiable boundary

No secrets or production credentials belong in this repository. Manuscripts and source material are user intellectual property; future implementation must enforce tenant isolation, explicit AI data-use rules, export reproducibility, reliable backup/recovery, and clear deletion controls before public release.