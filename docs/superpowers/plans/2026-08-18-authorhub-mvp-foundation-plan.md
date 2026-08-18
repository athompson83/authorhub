# AuthorHub MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first testable AuthorHub platform slice: monorepo foundation, authenticated multi-tenant book projects, structured manuscript hierarchy/editor contracts, and the infrastructure needed for later sources, AI, and publication modules.

**Architecture:** Use a TypeScript monorepo with a Next.js App Router web application, shared domain packages, Supabase/PostgreSQL for auth/data/storage, and a separate worker application boundary for durable jobs. Keep manuscript, auth, validation, and database boundaries explicit so later source/evidence, AI, and rendering work can be added without moving core types.

**Tech Stack:** TypeScript, Next.js, React, Tailwind CSS, shadcn/ui, TipTap/ProseMirror, Supabase/PostgreSQL, Zod, Vitest, Playwright, pnpm workspaces/Turborepo.

**Spec:** `docs/superpowers/specs/2026-08-18-authorhub-foundation-design.md`

## Global Constraints

- Initial market wedge: serious nonfiction authors; underlying manuscript model remains genre-neutral.
- One canonical semantic manuscript feeds all output formats.
- Do not store an entire book as one opaque rich-text blob.
- Stable block IDs are required for durable external references.
- Book and edition are separate domain entities.
- AI may not silently overwrite accepted manuscript text.
- Tenant authorization is enforced server-side and by RLS for user-facing Supabase data.
- Long-running work uses persisted jobs with idempotency.
- No secrets or production credentials in git.
- MVP excludes direct retailer publishing, royalty aggregation, audiobook generation, companion websites, social ad management, native mobile apps, translation, and marketplaces.

---

## Target file structure

```text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
.env.example
.github/workflows/ci.yml
apps/
  web/
    app/
      (marketing)/
      (auth)/
      (product)/
    components/
    features/
      books/
      manuscript/
    lib/
    tests/
  worker/
    src/
      jobs/
    tests/
packages/
  auth/
  database/
  manuscript/
  ui/
  validation/
supabase/
  migrations/
  tests/
```

The first implementation slice intentionally does not create placeholder packages for every future domain. Add `ai`, `sources`, `citations`, `publishing`, and `rendering` when their first real behavior is implemented.

---

### Task 1: Monorepo and CI foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.github/workflows/ci.yml`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`

**Interfaces:**
- Produces workspace scripts `typecheck`, `lint`, `test`, and `build` used by all later tasks.
- Produces environment variable names only; no values or secrets.

- [ ] **Step 1: Add a failing workspace smoke test/check**

Create a minimal CI script expectation that `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` are defined and fail until workspace packages exist.

- [ ] **Step 2: Run the smoke check and confirm failure**

Run the repository validation command selected by the implementer. Expected: failure because workspace configuration/scripts do not yet exist.

- [ ] **Step 3: Create the root workspace configuration**

Use pnpm workspaces and Turborepo. Root scripts must delegate to packages/apps and support CI without accessing production services.

- [ ] **Step 4: Add CI workflow**

CI must install with frozen lockfile, then run typecheck, lint, test, and build. Do not silently skip a failed workspace package.

- [ ] **Step 5: Verify locally**

Run:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all controlling commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold AuthorHub monorepo and CI"
```

### Task 2: Web application shell and design system

**Files:**
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/(marketing)/page.tsx`
- Create: `apps/web/app/(auth)/sign-in/page.tsx`
- Create: `apps/web/app/(product)/layout.tsx`
- Create: `apps/web/app/(product)/library/page.tsx`
- Create: `packages/ui/src/*`
- Test: `apps/web/tests/smoke.spec.ts`

**Interfaces:**
- Produces the route groups and product shell later features use.
- Product shell must reserve navigation concepts for Library, Search, Recent, Templates, and Settings without fake functionality.

- [ ] **Step 1: Write Playwright smoke expectations**

Test public home page, sign-in route, and library route shell rendering. The unauthenticated library behavior may be temporarily deterministic until Task 4 wires auth.

- [ ] **Step 2: Run and confirm failure**

Expected: routes/components do not exist.

- [ ] **Step 3: Build the app shell**

Use responsive, accessible components and restrained professional styling. Do not create a generic AI-chat landing page.

- [ ] **Step 4: Run browser and unit checks**

Expected: smoke checks pass; no console errors on the tested routes.

- [ ] **Step 5: Commit**

```bash
git add apps/web packages/ui
git commit -m "feat: add AuthorHub web application shell"
```

### Task 3: Validation and domain identity primitives

**Files:**
- Create: `packages/validation/src/index.ts`
- Create: `packages/manuscript/src/schema.ts`
- Create: `packages/manuscript/src/block-id.ts`
- Create: `packages/manuscript/src/index.ts`
- Test: `packages/manuscript/src/block-id.test.ts`
- Test: `packages/manuscript/src/schema.test.ts`

**Interfaces:**
- Produces `createBlockId(): string`.
- Produces versioned manuscript document/block Zod schemas.
- Every addressable canonical block requires `blockId`.

- [ ] **Step 1: Write failing tests**

Tests must prove a document without required stable block IDs fails validation and a valid document round-trips through the schema.

- [ ] **Step 2: Run tests and verify failure**

Expected: missing schemas/functions.

- [ ] **Step 3: Implement minimal versioned manuscript schema**

Do not implement citations/claims yet. Establish only the structural contract needed by the editor and later references.

- [ ] **Step 4: Run tests**

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/validation packages/manuscript
git commit -m "feat: define canonical manuscript schema primitives"
```

### Task 4: Supabase auth and tenant foundation

**Files:**
- Create: `packages/auth/src/roles.ts`
- Create: `packages/auth/src/permissions.ts`
- Create: `packages/database/src/types.ts`
- Create: `supabase/migrations/<timestamp>_identity_tenancy.sql`
- Create: `supabase/tests/identity_tenancy.test.sql`
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/client.ts`
- Modify: `apps/web/app/(product)/layout.tsx`

**Interfaces:**
- Produces organization roles `owner | admin | member`.
- Produces book roles `owner | author | editor | reviewer | researcher | viewer`.
- Creates `profiles`, `organizations`, and `organization_memberships` with RLS.

- [ ] **Step 1: Write database tests first**

Prove member can read their organization; unrelated authenticated user cannot; anonymous user cannot; owner can manage membership according to policy.

- [ ] **Step 2: Run database tests and verify failure**

Expected: relations/policies absent.

- [ ] **Step 3: Implement migration and auth helpers**

Policies must fail closed. Avoid trusting client-supplied organization IDs without membership checks.

- [ ] **Step 4: Gate product routes by authenticated session**

Unauthenticated users are redirected to sign-in; do not expose protected server data during render.

- [ ] **Step 5: Run RLS, unit, and browser tests**

Expected: positive and negative cases pass.

- [ ] **Step 6: Commit**

```bash
git add packages/auth packages/database supabase apps/web
git commit -m "feat: add authenticated tenant foundation"
```

### Task 5: Book project domain and library

**Files:**
- Create: `supabase/migrations/<timestamp>_books.sql`
- Create: `supabase/tests/books_rls.test.sql`
- Create: `apps/web/features/books/schemas.ts`
- Create: `apps/web/features/books/repository.ts`
- Create: `apps/web/features/books/actions.ts`
- Create: `apps/web/features/books/components/book-card.tsx`
- Create: `apps/web/features/books/components/new-book-dialog.tsx`
- Modify: `apps/web/app/(product)/library/page.tsx`
- Test: `apps/web/features/books/*.test.ts`
- Test: `apps/web/tests/books.spec.ts`

**Interfaces:**
- Produces `createBook`, `listBooks`, `archiveBook`, and book membership authorization.
- Book creation accepts title, optional subtitle, audience, purpose, and optional target word count.

- [ ] **Step 1: Write failing DB/domain/browser tests**

Prove users cannot read books outside authorized organization/book scope and a valid author can create/open/archive their book.

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Add book tables/RLS and repository actions**

Keep SQL and application authorization consistent.

- [ ] **Step 4: Build Library UI**

Book cards show title, status, words, approved chapters/total, unresolved claims placeholder only when real data exists, and last edit time. Do not fake metrics.

- [ ] **Step 5: Run full relevant test suite**

- [ ] **Step 6: Commit**

```bash
git add supabase apps/web
git commit -m "feat: add book projects and library"
```

### Task 6: Manuscript hierarchy

**Files:**
- Create: `supabase/migrations/<timestamp>_manuscript_nodes.sql`
- Create: `supabase/tests/manuscript_nodes_rls.test.sql`
- Create: `apps/web/features/manuscript/repository.ts`
- Create: `apps/web/features/manuscript/actions.ts`
- Create: `apps/web/features/manuscript/tree.ts`
- Test: `apps/web/features/manuscript/tree.test.ts`

**Interfaces:**
- Produces CRUD/reorder operations for manuscript nodes.
- Node types support front matter, part, chapter, section, back matter, appendix, bibliography, custom.
- Ordering must be deterministic and safely mutable.

- [ ] **Step 1: Write hierarchy and authorization tests**

Include reordering, parent-child validation, cross-book parent rejection, and viewer/reviewer mutation denial.

- [ ] **Step 2: Verify failures**

- [ ] **Step 3: Implement migration/domain services**

A node's content must validate against the versioned canonical manuscript schema before persistence.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add supabase apps/web/features/manuscript packages/manuscript
git commit -m "feat: add structured manuscript hierarchy"
```

### Task 7: Book workspace and chapter editor

**Files:**
- Create: `apps/web/app/(product)/books/[bookId]/page.tsx`
- Create: `apps/web/app/(product)/books/[bookId]/chapters/[nodeId]/page.tsx`
- Create: `apps/web/features/manuscript/components/manuscript-rail.tsx`
- Create: `apps/web/features/manuscript/components/editor.tsx`
- Create: `apps/web/features/manuscript/components/context-panel.tsx`
- Create: `apps/web/features/manuscript/autosave.ts`
- Test: `apps/web/features/manuscript/autosave.test.ts`
- Test: `apps/web/tests/manuscript-editor.spec.ts`

**Interfaces:**
- Chapter-scoped TipTap editor consumes/produces canonical schema.
- Autosave exposes explicit `idle | saving | saved | error` state.
- Failed save never reports saved.

- [ ] **Step 1: Write autosave and browser tests**

Prove content survives reload after successful save and failed mutation visibly reports error without discarding unsaved client state.

- [ ] **Step 2: Run and verify failure**

- [ ] **Step 3: Implement workspace layout**

Desktop: manuscript rail + editor + contextual panel. Small screens collapse rail/panel to drawers/sheets.

- [ ] **Step 4: Implement editor and autosave**

Load one chapter/section at a time. Do not instantiate a single editor for the full book.

- [ ] **Step 5: Run relevant unit/browser tests**

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat: add structured chapter writing workspace"
```

### Task 8: Derived block index and search-ready projection

**Files:**
- Create: `supabase/migrations/<timestamp>_manuscript_block_index.sql`
- Create: `packages/manuscript/src/index-blocks.ts`
- Test: `packages/manuscript/src/index-blocks.test.ts`
- Create: `apps/worker/src/jobs/index-manuscript-node.ts`
- Test: `apps/worker/tests/index-manuscript-node.test.ts`

**Interfaces:**
- Produces deterministic block projection from canonical node content.
- Derived table is not directly editable.

- [ ] **Step 1: Write projection tests**

Prove stable block IDs map to node/book identity, plain text, ordinal, and content hash.

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement projection and job boundary**

Job must verify organization/resource relationship and be idempotent for the same node content hash.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add packages/manuscript apps/worker supabase
git commit -m "feat: add manuscript block indexing"
```

### Task 9: Snapshot foundation

**Files:**
- Create: `supabase/migrations/<timestamp>_revisions_snapshots.sql`
- Create: `supabase/tests/revisions_snapshots.test.sql`
- Create: `apps/web/features/manuscript/snapshots.ts`
- Test: `apps/web/features/manuscript/snapshots.test.ts`

**Interfaces:**
- Produces named snapshots containing exact node/version/content hashes.
- Produces restore operation that writes a new revision rather than deleting history.

- [ ] **Step 1: Write snapshot/restore tests**

Prove snapshot reconstructs exact content and restore is itself reversible/auditable.

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement revision/snapshot tables and service**

Publication-specific immutable release behavior remains for the later publishing plan.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add supabase apps/web/features/manuscript
git commit -m "feat: add manuscript snapshots and reversible restore"
```

### Task 10: Foundation verification and handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md` only to mark actually completed foundation items
- Create: `docs/DEVELOPMENT.md`

**Interfaces:**
- Produces exact local setup and test commands for subsequent agents.

- [ ] **Step 1: Run complete local gates**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run database/RLS and Playwright suites using the documented local/test Supabase setup.

- [ ] **Step 2: Verify no hidden skipped controlling gates**

Any skipped test must be listed and justified; do not report skipped security/database checks as passed.

- [ ] **Step 3: Verify repository hygiene**

Check no secrets, generated production credentials, local environment files, or protected user content are tracked.

- [ ] **Step 4: Update development documentation**

Document exact prerequisites, environment variable names, local Supabase workflow, migrations, test commands, and worker start command.

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: complete AuthorHub foundation handoff"
```

## Subsequent implementation plans

After this plan is complete, write separate reviewed plans for:
1. Source ingestion + evidence + citations.
2. AI operations + provenance + evaluations.
3. Publication Studio + editions + readiness.
4. DOCX/EPUB/PDF renderer and preflight.
5. Billing/admin/analytics + production release hardening.

Do not collapse those independent subsystems into one giant implementation branch.
