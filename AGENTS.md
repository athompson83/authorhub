# AGENTS.md — AuthorHub

## Mission

Build AuthorHub as a production-grade author operating system. The initial commercial wedge is serious nonfiction authors who need source-grounded writing, evidence verification, controlled AI assistance, version history, professional exports, and publication readiness.

## North-star workflow

Create book → define audience/purpose → import source material → build outline → draft → review → verify claims → resolve citations → freeze manuscript → generate DOCX/EPUB/PDF → complete publishing metadata → publication readiness.

## Product boundaries

### MVP includes
- Authentication and workspace tenancy
- Multiple book projects
- Structured manuscript hierarchy
- Long-form editor
- Automatic table of contents
- Source ingestion and source library
- Citations and bibliography
- Claim/evidence verification
- Controlled AI authoring and editorial operations
- AI provenance
- Comments and suggestions
- Autosave history and named snapshots
- DOCX, EPUB, and print-ready PDF export
- Publication-readiness workflow
- ISBN/barcode guidance
- Publishing metadata preparation
- Billing, admin, analytics, SEO marketing site

### MVP excludes
- Direct retailer publishing
- Sales/royalty aggregation
- Native audiobook generation
- Companion website builder
- Social ad management
- Translation workflows
- Author-services marketplace
- Native mobile apps

Do not add excluded features unless the owner explicitly changes scope.

## Architectural rules

1. The manuscript must have one canonical semantic representation. Do not maintain independent source copies for PDF, EPUB, DOCX, web, or audio.
2. Do not store an entire book as one opaque rich-text blob. Manuscript structure and stable block identities must remain addressable.
3. Claims, citations, evidence, comments, AI generations, and revision events are first-class data entities.
4. A `book` is intellectual content. An `edition` is a publication manifestation. Do not merge these concepts.
5. AI changes must never silently overwrite accepted manuscript text.
6. Every substantive AI generation must preserve provenance sufficient to identify operation, provider/model, inputs/context references, output, disposition, and usage/cost metadata.
7. Human-authored, AI-assisted, and AI-generated content must be distinguishable from stored provenance. Do not infer this retrospectively from prose style.
8. Tenant authorization is server-enforced. UI hiding is not authorization.
9. Use PostgreSQL row-level security for tenant-owned Supabase data unless a documented exception is approved.
10. No manuscript, source, or unreleased author content may be used for model training without explicit opt-in.
11. External provider behavior must be isolated behind application-owned interfaces.
12. Long-running ingestion, AI, rendering, and publication tasks must run as jobs, not as fragile request-lifetime work.
13. Do not build direct retailer automation by browser impersonation.
14. No secrets, service-role keys, access tokens, or production credentials in git.

## Technical baseline

- TypeScript-first
- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui
- TipTap / ProseMirror
- TanStack Query where client-side server state is required
- PostgreSQL / Supabase
- Supabase Auth
- Supabase Storage
- pgvector for semantic retrieval when needed
- Zod for runtime contract validation
- Vitest for unit/integration tests
- Playwright for critical browser workflows
- Provider-neutral AI abstraction
- Vercel for web delivery; separate job/rendering infrastructure when request runtime constraints make it necessary

Before adding a new major library, record why an existing dependency or platform primitive is insufficient.

## Repository structure

Target monorepo:

```text
apps/
  web/                    # product + marketing web app
  worker/                 # durable/background jobs
packages/
  ai/                     # provider-neutral AI contracts and operations
  auth/                   # authorization helpers and policy contracts
  citations/              # citation/bibliography domain
  database/               # generated DB types and repository helpers
  manuscript/             # canonical manuscript model and transforms
  publishing/             # editions, metadata, readiness
  rendering/              # DOCX/EPUB/PDF pipelines
  sources/                # ingestion/source/evidence contracts
  ui/                     # shared design system
  validation/             # shared runtime schemas
supabase/
  migrations/
  tests/
docs/
  adr/
  superpowers/
    specs/
    plans/
```

Keep files small and bounded by responsibility. Avoid generic `utils.ts` dumping grounds.

## Data rules

- Use UUIDs or platform-native UUID equivalents for persistent identities.
- Store timestamps in UTC.
- Every tenant-owned row must have a clear ownership path to an organization/workspace.
- Soft deletion is permitted only when retention/recovery semantics are explicit.
- Published release artifacts must be immutable; updates create new release/version records.
- Stable manuscript block IDs must survive ordinary edits and formatting changes.
- Never use raw editor character offsets as the sole durable reference for claims/citations/comments.
- Database migrations are append-only once merged to a shared environment.

## AI rules

- Separate deterministic application logic from model judgment.
- Retrieval must cite internal source IDs/chunks; generated citations may not be fabricated.
- Never label a claim `supported` solely because a model says it is true.
- Claim verification must be evidence-backed.
- AI output enters the manuscript through an explicit accept/apply flow except for owner-approved fully generative modes.
- Preserve original output and accepted/revised output separately where provenance requires it.
- Enforce token/cost limits and idempotency for retriable jobs.
- Store model/provider identifiers; do not couple domain types to one vendor's SDK shapes.

## Security and privacy

Treat unreleased manuscripts as high-value intellectual property.

Required principles:
- deny by default
- least privilege
- signed storage access
- explicit collaborator roles
- audit sensitive operations
- avoid logging manuscript/source bodies
- redact secrets and tokens
- verify webhook signatures
- protect export URLs
- support account/project export and deletion
- document AI provider retention/data-use behavior

## UX rules

The product must feel like professional publishing software, not a generic AI dashboard.

- Author language over developer language: use `Snapshot`, `Compare`, `Restore`, `Edition`, `Source`, `Claim`, `Ready to publish`.
- Avoid exposing commits, branches, embeddings, jobs, JSON, or provider internals in normal author workflows.
- AI should be contextual to the selected passage/chapter/book.
- Always show save/sync/job status where data loss could be feared.
- Accessibility is required: keyboard editing/navigation, semantic controls, focus states, contrast, reduced-motion compatibility.
- Responsive web is required; the serious writing experience may be desktop-optimized but core review/read flows must remain usable on tablets/mobile.

## Testing contract

New behavior follows test-driven development where practical.

Minimum gates before merging implementation work:
- typecheck
- lint
- unit tests
- integration tests for changed domain boundaries
- database/RLS tests for changed policies
- critical Playwright flows when UI behavior changes
- export validation when rendering changes

Never weaken a test or security policy merely to make CI green.

## Definition of done

A feature is not done unless:
1. The behavior matches the approved spec.
2. Authorization is enforced server-side.
3. Error/empty/loading states are handled.
4. Tests prove expected and negative behavior.
5. Relevant docs are updated.
6. No unrelated scope was introduced.
7. User-facing terminology is consistent.
8. Observability is sufficient to diagnose production failure without logging protected manuscript content.

## Git workflow

- Work on focused branches.
- Prefer small, reviewable commits.
- Do not force-push shared branches unless explicitly approved.
- Open draft PRs for meaningful implementation work.
- Do not merge merely because automated checks pass; owner/reviewer approval still applies.
