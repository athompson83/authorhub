# AuthorHub

AuthorHub is a structured author operating system for serious nonfiction authors. It is designed to take a book from source material and outline through drafting, evidence verification, editing, version history, professional export, and publication readiness.

## Product direction

The initial market wedge is source-grounded nonfiction. The underlying manuscript and publishing model is genre-neutral so fiction, textbooks, manuals, and collaborative publishing workflows can be added later without replacing the core architecture.

## North-star workflow

Create book → define audience and purpose → import source material → build outline → write chapters → review with AI and humans → verify factual claims → resolve citations → freeze manuscript → generate DOCX/EPUB/PDF → complete publishing metadata → reach publication readiness.

## Repository status

This repository is in foundation stage. Product, architecture, security, data, AI, export, UX, and delivery specifications live under `docs/` before application code is introduced.

## Documentation

- `AGENTS.md` — repository rules for coding agents
- `docs/PRODUCT.md` — product scope and requirements
- `docs/ARCHITECTURE.md` — system design and package boundaries
- `docs/DATA_MODEL.md` — canonical data model and tenancy rules
- `docs/AI.md` — AI orchestration, provenance, and safety rules
- `docs/SECURITY.md` — security and intellectual-property controls
- `docs/EXPORTS.md` — canonical manuscript and publication rendering pipeline
- `docs/UX.md` — information architecture and core workflows
- `docs/ROADMAP.md` — MVP → Beta → Production delivery path
- `docs/DECISIONS.md` — architectural decision record index
- `docs/TESTING.md` — quality and release gates

## Planned technical baseline

- Next.js + React + TypeScript
- PostgreSQL / Supabase
- Supabase Auth and Storage
- TipTap / ProseMirror for structured editing
- pgvector for semantic retrieval
- Provider-neutral AI layer
- Background workers for ingestion, AI, exports, and publication jobs
- Vercel for web delivery with dedicated worker/rendering infrastructure where required

No secrets or production credentials belong in this repository.
