# AuthorHub Architecture

## Architectural goals

AuthorHub must support long-lived books, large manuscripts, high-value private source material, evidence-backed AI workflows, professional exports, and future publication/distribution integrations without forcing a rewrite of the core manuscript model.

## System overview

```text
Browser
  |
  v
Next.js Web App
  |-- Auth/session boundary
  |-- Server actions/API routes
  |-- Editor UI
  |-- Project/library UI
  |-- Publication studio
  |
  +--> PostgreSQL / Supabase
  |      |-- tenancy + RLS
  |      |-- manuscript metadata/content
  |      |-- claims/citations/provenance
  |      |-- job state
  |
  +--> Supabase Storage
  |      |-- source files
  |      |-- images/assets
  |      |-- generated artifacts
  |
  +--> Background Worker
         |-- source extraction/chunking
         |-- embeddings
         |-- AI jobs
         |-- DOCX/EPUB/PDF rendering
         |-- validation/preflight
         |-- future publication connectors
```

## Monorepo target

```text
apps/
  web/
    app/
      (marketing)/
      (auth)/
      (product)/
      api/
    components/
    features/
    lib/
    tests/
  worker/
    src/
      jobs/
      runners/
      providers/
    tests/
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

## Bounded domains

### Manuscript
Owns canonical semantic document structure, nodes, block identities, ordering, transforms, and serialization contracts. It does not know about AI provider SDKs or publication retailers.

### Sources
Owns source metadata, files, extraction, chunks, source locations, and evidence references.

### Citations
Owns citation records, styles, bibliography formatting, and citation completeness checks.

### AI
Owns provider-neutral model invocation, operations, provenance envelopes, usage/cost records, retry/idempotency controls, and model-output schemas.

### Publishing
Owns editions, readiness rules, metadata, ISBN records, release snapshots, and future channel submission state.

### Rendering
Consumes canonical manuscript + edition configuration and produces DOCX/EPUB/PDF artifacts and validation results.

### Auth
Owns role and permission contracts independent of UI components.

## Canonical manuscript strategy

The editor uses ProseMirror/TipTap, but the database/application contract must not become an unversioned opaque editor JSON dump.

Recommended representation:
- `manuscript_nodes` define book hierarchy (front matter, part, chapter, section, etc.).
- each editable node has canonical structured content using a versioned JSON schema compatible with the editor.
- stable `blockId` attributes identify addressable blocks within content.
- domain entities such as claims/comments/citations attach to stable block IDs plus resilient anchors/ranges, not only raw character offsets.
- serializers/transforms live in `packages/manuscript`.

Schema versions must be explicit so future document migrations are deterministic.

## Large-document strategy

Do not load an entire 100,000-word book into one editor instance.

Default model:
- book navigation loads metadata for all manuscript nodes
- editor loads one chapter/section document at a time
- book-level search/index and AI operate against server-side derived representations
- book-level exports assemble canonical node content in order
- word counts and readiness summaries are materialized/derived outside the active editor document

This limits browser memory, reduces conflict surface, and makes autosave/versioning tractable.

## Data access

Use server-side repository/service functions as the application boundary around Supabase queries. Avoid spreading raw database calls throughout UI components.

Expected flow:

```text
UI -> server action/API -> domain service -> repository -> database
```

For privileged worker operations, use service credentials only within trusted server/worker runtimes and still apply explicit tenant/job ownership checks.

## Jobs

Long operations are modeled as jobs with persisted state.

Minimum job fields:
- id
- organization_id
- actor_user_id
- type
- resource_type/resource_id
- idempotency_key
- status: queued/running/succeeded/failed/cancelled
- attempts
- progress
- error_code/error_summary
- created_at/started_at/completed_at

Jobs should be safe to retry when the operation contract says they are retriable. Artifact creation must avoid duplicate publication releases or duplicate charges.

## AI orchestration

Use application-owned operation contracts rather than exposing provider chat APIs directly.

Example operations:
- `rewrite_passage`
- `developmental_review`
- `extract_claims`
- `verify_claim_against_sources`
- `suggest_citations`
- `book_structure_review`

Each operation defines:
- validated input schema
- allowed context
- output schema
- provenance requirements
- cost budget
- retry policy
- whether human acceptance is required

Provider adapters translate these contracts to vendor SDK calls.

## Search and retrieval

Use two search modes:
1. exact/full-text search for manuscript/source text
2. semantic retrieval using pgvector for discovery and AI context

Semantic similarity never replaces source attribution. Retrieval results must retain source/chunk/location identity.

## Export pipeline

```text
Canonical manuscript + edition config
  -> normalized publication document
  -> format adapter
       -> DOCX
       -> EPUB 3
       -> print HTML/CSS -> PDF
  -> format validator
  -> artifact record
  -> signed download
```

Renderers cannot mutate the canonical manuscript. Formatting choices belong to edition/theme configuration.

## Deployment

### Web
Vercel-hosted Next.js application.

### Database/Auth/Storage
Dedicated Supabase project per environment where practical. Production must not share mutable data with preview/development.

### Worker/rendering
Use infrastructure suited to durable/background work. Do not force long-running PDF/EPUB/source-ingestion jobs into request-lifetime Vercel functions if runtime limits make reliability poor.

## Environments

At minimum:
- local/dev
- persistent preview/staging
- production

Migrations must be rehearsed against disposable or staging databases before production deployment.

## Observability

Capture:
- request/job correlation IDs
- job state transitions
- export validation failures
- AI operation/provider/model/cost/latency
- authorization denials
- ingestion failures

Do not log manuscript/source bodies by default. Error telemetry should prefer identifiers, hashes, sizes, and safe summaries.

## Extensibility rules

Future distributor, audiobook, cover, website, and sales integrations attach through provider interfaces around existing `book` and `edition` entities. They must not redefine the manuscript model.

## Explicit anti-patterns

Do not:
- use one giant `books.content` text/blob column as the sole manuscript
- let UI role checks substitute for database/server authorization
- couple persisted AI data to OpenAI/Anthropic SDK response objects
- allow export services to become a second editable manuscript source
- store generated citations without source identity
- run costly/retriable background work without idempotency
- create retailer integrations through brittle browser impersonation
