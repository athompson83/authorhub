# AuthorHub Roadmap

## Delivery strategy

AuthorHub follows MVP → Beta → Production. Each phase must produce usable, testable software with explicit release gates. Do not pull future modules forward unless the owner changes scope.

## Phase 0 — Foundation

Goal: establish build contracts before feature implementation.

Deliverables:
- repository structure
- agent rules
- product specification
- architecture
- data model
- security model
- AI/provenance contracts
- UX information architecture
- export architecture
- testing strategy
- ADRs for major irreversible decisions
- implementation plan

Exit criteria:
- no unresolved architecture contradiction affecting MVP
- implementation tasks can be assigned without inventing domain boundaries

## Phase 1 — MVP Core

### 1A. Platform foundation
- Next.js monorepo scaffold
- shared packages
- Supabase environments
- auth
- organizations/workspaces
- book/project model
- billing entitlement skeleton
- CI gates

### 1B. Manuscript engine
- book hierarchy
- chapter/section editor
- stable block IDs
- autosave
- word counts
- TOC
- search
- chapter status
- named snapshots
- compare/restore

### 1C. Research and evidence
- source upload/import
- secure storage
- extraction jobs
- source metadata
- searchable chunks
- source viewer
- claims
- claim-evidence links
- citation entities
- bibliography

### 1D. AI assistance
- provider-neutral AI package
- operation registry
- provenance records
- passage rewrite/review
- chapter review
- claim extraction
- evidence-backed verification
- citation suggestions
- usage/cost limits

### 1E. Publication studio
- editions
- readiness engine
- metadata editor
- ISBN guidance
- canonical normalized publication document
- DOCX
- EPUB 3 + validation
- print PDF + preflight
- immutable release artifacts

### 1F. Commercial readiness
- subscription plans
- usage metering
- admin support surfaces
- privacy/security documentation
- marketing site
- SEO foundations
- onboarding analytics
- backup/recovery rehearsal

MVP exit criteria:
- representative 100k-word book can be edited without unacceptable degradation
- cross-tenant authorization suite passes
- source→claim→evidence flow works end-to-end
- AI changes remain reviewable and provenance-backed
- DOCX/EPUB/PDF generated from one snapshot
- EPUB validation passes on supported manuscript fixtures
- publication readiness distinguishes blockers/warnings
- customer can export/delete project data according to policy
- paid account can complete north-star workflow

## Phase 2 — Private Beta

Goal: validate completion behavior with real serious nonfiction authors.

Add/strengthen:
- editor/reviewer collaboration UX
- improved source importers
- reference manager interoperability where useful
- advanced interior themes
- cover asset/readiness tools
- richer compare/review
- AI evaluation harness and model-routing tuning
- onboarding templates for professional nonfiction categories
- guided distributor handoff
- pilot audiobook provider integration
- stronger audit/support tooling

Beta metrics:
- activation
- weekly writing/review activity
- chapter approval velocity
- claim resolution velocity
- validated export success rate
- book completion rate
- paid retention by manuscript stage
- AI gross margin

Beta exit criteria:
- multiple users complete real books
- critical data-loss incidents = 0
- high-severity cross-tenant/security findings = 0
- export success is reliable on representative complex books
- users can recover from failed jobs/imports without support intervention for common cases
- evidence/provenance features demonstrate retention/value rather than being unused complexity

## Phase 3 — Production v1

Goal: public commercial release with operational reliability.

Add:
- public self-service onboarding
- mature billing lifecycle
- account/team administration
- production support tooling
- rate limits and abuse controls
- observability/SLOs
- documented incident response
- refined SEO content system
- public templates/use cases
- accessibility audit
- dependency/security scanning
- disaster recovery test

Production gate:
- security review complete
- privacy/terms reviewed
- backups/recovery proven
- production migrations rehearsed
- key workflows have Playwright coverage
- no known P0/P1 product defects
- AI/provider failure modes degrade safely
- renderer regression corpus passes

## Phase 4 — Publishing Network

Only after core product-market evidence.

Candidates:
- distributor API/business partnerships
- channel submission tracking
- edition update workflows
- rejection/correction workflows
- sales and royalty ingestion
- unified author business dashboard

Do not build retailer browser impersonation.

## Phase 5 — Author Business Platform

Candidates:
- companion sites
- newsletter/reader CRM
- media kit
- bulk sales workflows
- speaking/consulting lead capture
- audiobook production expansion
- translation editions
- rights/licensing
- publisher/agency workspace
- co-author royalty allocation

## Sequencing principle

Features that help an author finish a credible book outrank features that market a book that has not yet been finished.
