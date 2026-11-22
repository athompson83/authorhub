# AuthorHub Testing Strategy

## Quality objective

AuthorHub handles large manuscripts, valuable intellectual property, structured evidence, AI-authored suggestions, and publication artifacts. Tests must prove not only happy-path behavior but isolation, reversibility, idempotency, and output validity.

## Test layers

### Unit tests
Use Vitest for pure domain behavior:
- manuscript transforms
- stable block-ID handling
- chapter status transitions
- readiness rules
- citation formatting helpers
- AI operation validation
- permission predicates
- renderer normalization
- pricing/usage calculations

### Integration tests
Cover boundaries where defects are expensive:
- repository/service methods against PostgreSQL
- source ingestion state transitions
- claim/evidence consistency
- snapshot reconstruction
- AI provenance persistence
- job retry/idempotency
- release/artifact creation

### Database and RLS tests
Every changed policy requires positive and negative cases.

Minimum matrix:
- owner
- author
- editor
- reviewer
- researcher
- viewer
- unrelated same-organization member
- unrelated different-organization user
- unauthenticated user where applicable

Mandatory negatives include guessed UUID access and cross-tenant object-storage metadata access.

### Browser tests
Use Playwright for north-star flows:
1. sign in and create project
2. create/reorder manuscript structure
3. edit and autosave chapter
4. import source and observe processing state
5. attach evidence to claim
6. run AI suggestion and accept/reject
7. create snapshot and restore
8. create edition and resolve readiness blockers
9. generate/download export
10. permission-limited collaborator behavior

### Renderer regression tests
Maintain fixture books covering:
- long prose
- nested headings
- lists
- tables
- images
- footnotes/endnotes
- citations/bibliography
- front/back matter
- non-ASCII text
- page-break behavior
- large chapters

For each supported format:
- deterministic semantic assertions
- validator execution where available
- artifact hash is not used as the only assertion because renderer metadata can vary

### Performance tests
Representative targets must include:
- 100k-word book split across realistic chapters
- thousands of source chunks
- hundreds of claims/citations/comments

Track:
- chapter editor load
- save latency
- hierarchy/navigation load
- search latency
- export duration
- source ingestion throughput

Performance budgets should be tightened from measured baselines rather than guessed once implementation exists.

### AI evaluations
Maintain curated eval sets for:
- fabricated citations
- evidence attribution
- claim extraction
- contradictory-source handling
- semantic-preservation rewrites
- destructive edits
- voice adherence
- prompt injection in source material

Model upgrades require the relevant eval suite before production default changes.

## CI gates

Every PR should run, as applicable:
- dependency install lockfile integrity
- typecheck
- lint
- unit tests
- integration tests
- database/RLS tests
- build
- focused Playwright smoke tests

Scheduled/release pipelines add:
- full browser suite
- renderer fixture corpus
- EPUB validation
- security/dependency scan
- AI eval subset or release eval suite

## Migration gates

Before production migration:
1. forward migration succeeds on disposable/staging database
2. expected schema/policies exist
3. RLS tests pass
4. migration is idempotent only where explicitly designed; otherwise replay behavior is understood and blocked appropriately
5. rollback/recovery plan exists for destructive changes
6. production backup/recovery posture is confirmed

Never edit a migration already applied to a shared environment to change history.

## Failure semantics

Tests must prove:
- failed autosave does not falsely display saved state
- failed AI generation does not mutate canonical manuscript
- failed source extraction retains actionable failure state
- failed export does not create a validated release
- retried job does not double-charge or duplicate artifacts
- restore operation can itself be reversed
- unauthorized request fails closed

## Release evidence

A release candidate should retain:
- commit SHA
- migration set
- test results
- renderer versions
- AI default model/prompt versions
- known warnings
- export validator results

## Definition of green

A green suite means all controlling checks completed successfully. Skipped security, migration, renderer, or browser gates must be explicitly justified and must not be casually counted as passed.
