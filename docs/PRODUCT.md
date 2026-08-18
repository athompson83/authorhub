# AuthorHub Product Requirements

## Product thesis

AuthorHub is a structured author operating system for serious nonfiction authors. It helps experts turn scattered source material into a credible, publication-ready book while preserving authorship, evidence, version history, and professional publishing outputs.

## Initial customer

Primary MVP users:
- consultants and executives
- educators and clinicians
- researchers and technical experts
- coaches, speakers, and course creators
- professional associations and small publishing teams

The architecture must remain genre-neutral, but MVP workflows should optimize for research-grounded nonfiction rather than fiction-specific worldbuilding.

## Core value proposition

Turn expertise, research, and source material into a verified, professionally structured book, then generate publication-ready files and metadata from the same controlled project.

## Product principles

1. The author owns the manuscript, sources, and generated assets.
2. AI never silently modifies accepted text.
3. Fact-checking shows evidence, not unsupported model assertions.
4. The manuscript remains portable.
5. Human and AI contributions remain distinguishable through provenance.
6. Publishing outputs derive from one canonical manuscript.
7. Security and intellectual-property protection are product features.
8. The product should reduce publishing complexity without hiding consequential decisions from the author.

## North-star workflow

1. Create a book project.
2. Define audience, purpose, tone, terminology, and goals.
3. Import or create an outline.
4. Import sources and existing manuscript material.
5. Draft by chapter/section.
6. Use contextual AI for research, editing, and revision.
7. Identify and resolve factual claims and citations.
8. Complete human/editor review.
9. Freeze a publication candidate snapshot.
10. Configure editions and design.
11. Generate DOCX, EPUB, and PDF outputs.
12. Complete publishing metadata and ISBN guidance.
13. Reach 100% publication readiness.

## MVP capabilities

### Workspace and library
- authenticated account
- personal or organization workspace
- multiple book projects
- book cards with progress, words, chapter completion, unresolved claims, and recent activity
- author profile, imprint, and optional series metadata
- archive/restore projects

### Structured manuscript
- front matter, parts, chapters, sections, back matter
- drag-and-drop reordering
- stable node/block identities
- automatic table of contents
- word counts at book/chapter/section level
- chapter statuses: planned, researching, drafting, editing, fact_check, proof, approved
- book-level voice, audience, purpose, and terminology settings

### Long-form editor
- rich-text editing
- headings, lists, quotes, links, tables, images where supported
- footnotes/endnotes
- inline citations
- comments and suggestions
- find/replace within chapter and book
- autosave with visible save state
- keyboard-first workflows

### Research library
- upload/import PDF, DOCX, TXT, Markdown, web pages, audio/transcript-ready files, and notes
- source metadata and provenance
- searchable extracted content
- source-to-chapter associations
- highlight source passages and link them as evidence

### Claims and evidence
- claims as first-class entities
- status: needs_review, supported, partially_supported, disputed, unsupported, stale, author_experience, legal_review
- evidence connections to source excerpts
- contradictory evidence support
- verification timestamp and reviewer
- evidence view in manuscript

### Citations
- citation entities separate from display formatting
- bibliography generation
- APA, MLA, Chicago initially
- citation completeness checks
- source metadata editing

### AI authoring and review
Contextual passage operations:
- improve clarity
- shorten/expand
- preserve voice
- rewrite for audience
- check facts
- find evidence
- add citation suggestion
- detect repetition

Chapter operations:
- developmental review
- continuity review
- weak-claim detection
- missing-topic suggestions
- opening/conclusion critique
- citation audit

Book operations:
- structural review
- terminology consistency
- redundancy detection
- audience/readability review
- publication readiness analysis

### AI provenance
- operation type
- provider/model
- context/source references
- user instruction
- original model output
- accepted/applied output
- final human-edited result where applicable
- timestamps
- token/cost metadata

### Version history
- fine-grained autosave/revision events
- named snapshots
- compare revisions
- restore chapter/book content
- immutable publication release snapshots

### Export
- DOCX
- EPUB 3
- print-ready PDF
- reader PDF where useful
- export validation report
- metadata package
- AI-use/provenance report

### Publication readiness
Checklist groups:
- manuscript
- editorial
- citations/evidence
- accessibility
- print edition
- ebook edition
- cover
- metadata
- ISBN/barcode guidance

Publication readiness must distinguish blockers from warnings.

### Billing/admin/analytics
- subscription entitlements
- AI usage metering
- admin support tooling
- privacy-safe product analytics
- no manuscript bodies in analytics events

### Marketing site / SEO
- indexable public marketing pages
- use-case landing pages
- comparison/education content architecture
- schema.org metadata where appropriate
- fast Core Web Vitals
- sitemap and canonical URLs

## MVP non-goals

Do not implement in MVP:
- direct publishing to Amazon/KDP or other retailers
- royalty custody or payouts
- universal sales ingestion
- native audiobook generation
- companion website builder
- social ad manager
- native mobile apps
- translation workflow
- author-services marketplace
- fiction-specific character/world/story-bible tooling

## Future modules

### Beta candidates
- cover concept generation + editable production templates
- advanced interior themes
- collaboration roles beyond simple author/editor/reviewer
- audiobook provider integration
- guided distributor handoff
- companion site generator

### Production expansion
- distributor partnerships and submission tracking
- sales/royalty ingestion
- author business dashboard
- reader CRM / newsletter integrations
- translation editions
- rights/licensing management
- publisher/agency workspaces

## Roles

MVP roles:
- Owner: project and publication authority
- Author: write/edit
- Editor: edit/comment/suggest
- Reviewer: comment/suggest, no direct publication authority
- Researcher: manage sources/claims/citations
- Viewer: read-only

All role permissions must be server-enforced.

## Success metrics

Product activation:
- project created
- outline/manuscript imported or first chapter created
- first source imported
- first meaningful editing session completed

Value metrics:
- weekly manuscript words reviewed/accepted
- chapters reaching approved state
- unresolved claim count trending downward
- publication-readiness completion
- successful validated exports

Commercial metrics:
- trial-to-paid conversion
- project completion rate
- paid retention by active book stage
- AI gross margin
- export/launch-pack attach rate in future

Do not optimize engagement at the expense of book completion.

## Acceptance criteria for MVP product readiness

A representative nonfiction author must be able to:
1. Create a project and structured outline.
2. Write/import at least a 100,000-word manuscript without editor degradation severe enough to impede use.
3. Import sources and connect evidence to claims.
4. Use AI without losing existing content or provenance.
5. Compare and restore history.
6. Produce valid DOCX, EPUB, and print PDF artifacts from the same manuscript.
7. Complete a publication-readiness workflow.
8. Export/delete their content.
9. Collaborate according to role without unauthorized cross-tenant access.
