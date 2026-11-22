# Codex Handoff — AuthorHub Foundation

## Read first

Before modifying code, read in this order:

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-08-18-authorhub-foundation-design.md`
3. `docs/superpowers/plans/2026-08-18-authorhub-mvp-foundation-plan.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `docs/SECURITY.md`
7. `docs/AI.md`
8. `docs/EXPORTS.md`
9. this file

Do not broaden MVP scope while stabilizing the foundation.

## What is already implemented

### Repository/runtime

- pnpm workspace + Turborepo root
- Node 22 baseline
- web and worker applications
- auth, database, manuscript, and validation packages
- GitHub Actions validation workflow
- environment contract

### Identity and authorization

- Supabase browser and server clients using `@supabase/ssr`
- signup/sign-in UI
- authenticated product layout
- automatic profile + personal organization bootstrap trigger
- organization and book membership roles
- TypeScript permission matrix
- RLS on identity, organization, book, manuscript, snapshot, and job tables
- security-definer authorization helpers to avoid recursive membership policies

### Book workflow

- Library page
- create-book validation/action/repository
- database owner-membership trigger
- book workspace metadata
- chapter creation
- structured manuscript node table

### Manuscript foundation

- versioned canonical manuscript schema
- stable `blk_*` identifiers
- browser-safe ID generation
- block-ID normalization
- searchable block-index extraction
- TipTap editor
- 700 ms debounced autosave
- optimistic `content_version`
- atomic `save_manuscript_node` PostgreSQL RPC
- block index replaced in the same database transaction as manuscript save
- HTTP 409 conflict contract for stale edits

### Worker boundary

- validated server-only worker environment
- durable job type/handler contracts
- persisted `jobs` table with idempotency key

## Important: verification state

The code above was authored through the GitHub connector. The creating environment could not clone GitHub, install dependencies, run Supabase locally, or execute the repository. Therefore **do not report the foundation as green until you execute it yourself**.

The GitHub workflow temporarily uses `pnpm install --no-frozen-lockfile` because no generated lockfile exists yet. The first successful local install must generate and commit `pnpm-lock.yaml`; then change CI back to `pnpm install --frozen-lockfile`.

## Immediate execution sequence

### 1. Stabilize the scaffold

Run:

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Fix root causes; do not weaken gates or use blanket lint/type suppression.

Commit `pnpm-lock.yaml` after dependency resolution is stable.

### 2. Validate current dependency APIs

This repo intentionally uses current architecture contracts but dependency ranges may resolve to newer compatible releases. Confirm:

- Next.js 16 App Router async `params`, `searchParams`, and `cookies()` usage
- React `useActionState`
- `@supabase/ssr` browser/server cookie client contracts
- TipTap 3 `useEditor`, `immediatelyRender`, `Extension.addGlobalAttributes`, and StarterKit behavior
- ESLint 9 flat config

Prefer adapting our code to current stable APIs over downgrading packages unless a documented incompatibility exists.

### 3. Stand up disposable Supabase

Use a local/disposable database first. Apply all migrations from scratch and then re-run them through the project's normal reset/replay workflow.

Verify specifically:

- signup trigger creates profile, organization, and owner organization membership
- unrelated user cannot see another organization
- unrelated user cannot see another book
- book creation seeds owner book membership
- viewer cannot update manuscript nodes
- author/editor can update manuscript nodes
- owner can manage book memberships
- owner cannot accidentally delete their own last ownership membership through current policy
- stale `content_version` produces a conflict
- successful save updates node JSON and block index atomically
- duplicate block IDs cannot exist across the database

Add pgTAP or equivalent SQL tests; do not leave these as manual-only checks.

### 4. Exercise browser flow

Verify:

```text
Sign up
→ workspace auto-created
→ Library
→ create book
→ book workspace
→ add chapter
→ type text
→ autosave succeeds
→ reload
→ text persists
```

Then open the same chapter in two tabs and prove stale-tab save returns the conflict state rather than overwriting the newer version.

### 5. Tighten editor schema compatibility

The current canonical schema intentionally supports only the first writing primitives: paragraphs, headings, blockquotes, inline text marks. TipTap StarterKit can expose more node types through paste/keyboard behavior.

Before declaring the editor stable, choose one of these approaches:

- explicitly disable unsupported StarterKit nodes, or
- expand the canonical manuscript schema with tests for lists, hard breaks, code blocks, horizontal rules, links, and other approved nodes.

Do not allow the editor to produce JSON that the server cannot validate.

### 6. Persist stable IDs inside editor state

Current normalization guarantees saved documents have stable block IDs, but newly-created editor blocks may not receive their generated ID inside the live ProseMirror transaction until save/reload.

Implement a ProseMirror/TipTap transaction plugin that assigns missing block IDs immediately when addressable blocks are created. Add tests proving edits do not regenerate IDs.

### 7. Add snapshots/version history

Use the existing `manuscript_snapshots` table.

Required first behavior:

- create named chapter snapshot
- list snapshots newest first
- compare current content to snapshot
- restore snapshot only by creating a new current version; never destroy the historical snapshot
- publication snapshots are immutable

### 8. Continue foundation plan

After the above is green, continue the existing implementation plan rather than inventing a new roadmap. The next major subsystem should be the Source Library / evidence ingestion slice, followed by claim/citation modeling, then controlled AI operations.

## Architecture invariants

Do not change these without an ADR:

- no whole-book rich-text blob
- chapter/section-scoped canonical documents
- stable addressable block IDs
- claims/evidence/citations reference stable content identity
- tenant checks server-side and through RLS
- AI cannot silently overwrite accepted manuscript text
- accepted AI output has provenance
- book and edition are distinct concepts
- one canonical manuscript drives DOCX/EPUB/PDF
- long-running work goes through durable persisted jobs
- direct retailer publishing remains outside MVP

## Known intentionally incomplete areas

These are not defects in the current slice unless a change makes them appear functional:

- Sources inspector tab
- Claims inspector tab
- History inspector tab
- Share button
- Publication Readiness button
- Search
- Recent
- Templates
- Settings
- AI operations
- citation engine
- DOCX/EPUB/PDF rendering
- billing
- analytics/observability
- production deployment

Do not leave inert controls implying functionality in a Beta build. Either implement, disable with an explicit unavailable state, or remove them before Beta.
