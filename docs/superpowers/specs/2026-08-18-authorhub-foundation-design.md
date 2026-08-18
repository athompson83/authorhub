# AuthorHub Foundation Design

## Objective

Create the architecture and repository contract for a production-grade author operating system focused initially on serious nonfiction authors. The foundation must support large structured manuscripts, sources and evidence, citations, controlled AI assistance, provenance, version history, professional exports, and publication readiness without forcing later rewrites for editions, audiobook, distribution, or author-business modules.

## Product boundary

MVP optimizes the workflow:

Create book → define audience/purpose → import material → outline → draft → review → verify claims → resolve citations → freeze manuscript → create edition → export DOCX/EPUB/PDF → complete metadata → publication readiness.

Direct retailer publishing, sales aggregation, audiobook generation, companion sites, social ads, translation, marketplaces, and native mobile apps are deferred.

## Architecture

### Web application
A Next.js App Router application provides the public marketing site, authenticated product, project/editor UI, research/evidence UI, publication studio, account/billing surfaces, and internal admin surfaces.

### Database and tenancy
PostgreSQL/Supabase stores tenant, book, manuscript, source, evidence, provenance, edition, job, and release metadata. Organization membership plus book-level roles define access. RLS enforces tenant boundaries for user-facing database access.

### Manuscript
A book is not one giant editor instance. `manuscript_nodes` hold ordered structural units such as front matter, parts, chapters, sections, and back matter. Editable node content uses a versioned ProseMirror-compatible semantic document. Blocks requiring external references receive stable IDs.

### Source/evidence graph
Imported sources are stored privately, extracted asynchronously, and represented as metadata plus addressable source chunks that preserve original locations. Claims are first-class entities connected to supporting, contradictory, partial, or contextual evidence.

### AI
AI behavior is expressed as typed application operations rather than raw provider chat. Every substantive generation stores provider/model, operation, prompt version, context/source references, output, disposition, usage, cost, and timing. AI output does not silently overwrite accepted manuscript content.

### Versioning
Fine-grained revision events support operational history. Named snapshots support author milestones. Publication releases are based on immutable snapshots and generate immutable artifact records.

### Editions
Books and editions are separate. An edition defines manifestation-specific format, language, print dimensions, ISBN, price, design, metadata, and publication state.

### Rendering
All exports derive from a normalized publication document generated from canonical manuscript content plus edition configuration. Separate adapters generate DOCX, EPUB 3, and print HTML/CSS→PDF. Validation occurs before an artifact is treated as ready.

### Background work
Source extraction, embeddings, costly AI operations, and export rendering use persisted jobs with idempotency, retry limits, safe error states, and tenant/resource ownership.

## Repository layout

```text
apps/
  web/
  worker/
packages/
  ai/
  auth/
  citations/
  database/
  manuscript/
  publishing/
  rendering/
  sources/
  ui/
  validation/
supabase/
  migrations/
  tests/
docs/
  adr/
  superpowers/specs/
  superpowers/plans/
```

## Security

Unreleased manuscripts and source material are high-value intellectual property. Required controls include deny-by-default authorization, RLS, private object storage, signed downloads, no protected bodies in logs/analytics, explicit collaborator roles, safe AI-provider data use, environment isolation, secret management, and negative cross-tenant tests.

Imported source processing must account for parser abuse, malicious metadata/HTML, SSRF for webpage imports, oversized files, decompression bombs, and prompt injection contained in source text.

## UX

The core desktop workspace has a manuscript navigation rail, chapter-scoped editor, and contextual right panel for AI, sources, claims, comments, and history. Author-facing terminology avoids developer concepts. AI suggestions are previewed as diffs/actions; evidence status is inspectable; save/job status is always visible when data loss or long-running work could be feared.

Publication Studio organizes readiness into manuscript, editorial, evidence/citations, design, cover, metadata, ISBN, and exports. Readiness distinguishes blockers from warnings.

## Reliability requirements

- representative 100k-word books must remain usable because the editor loads chapter/section content rather than the full book
- failed AI operations do not mutate canonical content
- failed autosave does not show a false saved state
- failed source jobs remain recoverable/actionable
- retried jobs do not create duplicate releases or double-meter usage
- restores are auditable and reversible
- release artifacts map to exact snapshot/config/renderer versions

## Testing

Use Vitest for domain tests, PostgreSQL/RLS tests for tenancy and role rules, integration tests for source/evidence/provenance/jobs/releases, Playwright for critical author workflows, renderer fixture corpora, EPUB validation, and explicit AI evals for hallucinated citations, evidence attribution, destructive rewrites, and prompt injection.

## Major accepted decisions

1. Source-grounded nonfiction is the initial market wedge.
2. Canonical manuscript is structured and block-addressable.
3. Book and edition are separate.
4. AI providers are behind typed application-owned operations.
5. Substantive AI actions retain provenance.
6. Long-running work uses durable jobs.
7. All formats derive from one canonical manuscript.
8. Direct retailer automation is not MVP scope.

## MVP acceptance

The MVP is structurally successful when an authorized author can create a book, write/import a large manuscript, organize chapters, import sources, connect evidence to claims, use controlled AI assistance, resolve citations, create/restore snapshots, create editions, and generate validated DOCX/EPUB/PDF artifacts from an immutable publication candidate without unauthorized cross-tenant access or hidden destructive AI changes.
