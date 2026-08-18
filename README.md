# AuthorHub

AuthorHub is a structured author operating system for serious nonfiction authors. It is designed to take a book from source material and outline through drafting, evidence verification, editing, version history, professional export, and publication readiness.

## Product direction

The initial market wedge is source-grounded nonfiction. The underlying manuscript and publishing model is genre-neutral so fiction, textbooks, manuals, and collaborative publishing workflows can be added later without replacing the core architecture.

## North-star workflow

Create book → define audience and purpose → import source material → build outline → write chapters → review with AI and humans → verify factual claims → resolve citations → freeze manuscript → generate DOCX/EPUB/PDF → complete publishing metadata → reach publication readiness.

## Current implementation

The repository now contains an executable application foundation rather than documentation only:

- pnpm/Turborepo TypeScript monorepo
- Next.js App Router web application
- Supabase SSR browser/server clients
- email/password signup and sign-in
- automatic profile + personal workspace bootstrap after signup
- tenant-aware organizations and memberships with RLS
- multi-book Library and book creation flow
- structured manuscript hierarchy
- TipTap chapter editor
- stable manuscript block identifiers
- debounced autosave with optimistic content versions
- atomic PostgreSQL save + block-index replacement
- book and manuscript authorization primitives
- durable-job database/runtime boundary
- CI workflow for typecheck, lint, test, and build

The source/evidence engine, AI operations, snapshots UI, export/rendering engines, publishing readiness workflow, billing, and production observability remain subsequent implementation slices.

## Repository structure

```text
apps/
  web/       Next.js application and user-facing workflows
  worker/    durable background-work boundary
packages/
  auth/      role and permission contracts
  database/  shared database-facing record contracts
  manuscript/canonical manuscript schemas, IDs, normalization, indexing
  validation/shared validation utilities
supabase/
  migrations/database schema, RLS, atomic manuscript operations
docs/
  product, architecture, security, UX, AI, exports, testing, roadmap, plans
```

## Local setup

Requirements: Node.js 22+ and pnpm 10.15+.

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Configure these values before authenticated workflows can run:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY   # worker/server-only; never NEXT_PUBLIC
```

Apply the migrations in `supabase/migrations/` to a dedicated non-production Supabase project before running authenticated product flows.

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The initial connector-authored scaffold has not been locally executed in the environment that created it because that environment cannot clone GitHub. The first Codex task is therefore to install dependencies, generate and commit `pnpm-lock.yaml`, run every gate, fix any compile/runtime issues, and change CI back to `pnpm install --frozen-lockfile` once the lockfile is committed.

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
- `docs/implementation/CODEX_HANDOFF.md` — current implementation state and next execution sequence

No secrets or production credentials belong in this repository.
