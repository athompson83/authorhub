# AuthorHub Data Model

## Modeling principles

- Organization/workspace is the tenancy boundary.
- A book represents intellectual content; editions represent published manifestations.
- Manuscript hierarchy and editable content are separately addressable.
- Claims, citations, evidence, AI generations, comments, and revisions are first-class entities.
- Stable block identities are required for durable references.
- Publication releases are immutable.
- Database authorization is deny-by-default and backed by RLS.

## Core entities

### Identity and tenancy

#### profiles
- `user_id uuid pk` -> auth.users
- `display_name text`
- `avatar_path text null`
- `created_at timestamptz`
- `updated_at timestamptz`

#### organizations
- `id uuid pk`
- `name text`
- `slug text unique`
- `created_by uuid`
- `created_at timestamptz`

#### organization_memberships
- `organization_id uuid`
- `user_id uuid`
- `role enum(owner, admin, member)`
- `created_at timestamptz`
- unique `(organization_id, user_id)`

Organization membership alone does not grant every book permission. Book-level roles can further restrict access.

### Author/publisher identity

#### author_profiles
- `id uuid pk`
- `organization_id uuid`
- `owner_user_id uuid`
- `display_name text`
- `bio text null`
- `website_url text null`
- `metadata jsonb`

#### imprints
- `id uuid pk`
- `organization_id uuid`
- `name text`
- `publisher_name text null`
- `contact_metadata jsonb`

#### series
- `id uuid pk`
- `organization_id uuid`
- `name text`
- `description text null`

### Books

#### books
- `id uuid pk`
- `organization_id uuid`
- `author_profile_id uuid null`
- `series_id uuid null`
- `title text`
- `subtitle text null`
- `slug text`
- `status enum(planning, drafting, editing, publication_ready, published, archived)`
- `audience text null`
- `purpose text null`
- `voice_profile jsonb`
- `terminology jsonb`
- `target_word_count integer null`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`
- unique `(organization_id, slug)`

#### book_members
- `book_id uuid`
- `user_id uuid`
- `role enum(owner, author, editor, reviewer, researcher, viewer)`
- `created_at timestamptz`
- unique `(book_id, user_id)`

### Manuscript hierarchy

#### manuscript_nodes
Represents structural units in ordered tree form.

- `id uuid pk`
- `book_id uuid`
- `parent_id uuid null`
- `node_type enum(front_matter, part, chapter, section, back_matter, appendix, bibliography, custom)`
- `title text`
- `slug text`
- `position numeric`
- `status enum(planned, researching, drafting, editing, fact_check, proof, approved)`
- `include_in_toc boolean`
- `content_schema_version integer`
- `content jsonb`
- `word_count integer`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Content uses a versioned ProseMirror-compatible semantic JSON schema. Blocks needing durable references carry unique `blockId` attributes.

Do not make raw character offsets the only durable anchor.

#### manuscript_block_index
A derived/searchable projection for stable block-level access.

- `block_id uuid pk`
- `book_id uuid`
- `node_id uuid`
- `block_type text`
- `plain_text text`
- `ordinal integer`
- `content_hash text`
- `updated_at timestamptz`

This index is derived from canonical `manuscript_nodes.content`; it is not a second editable source of truth.

### Comments and suggestions

#### comments
- `id uuid pk`
- `book_id uuid`
- `node_id uuid`
- `block_id uuid null`
- `anchor jsonb null`
- `author_user_id uuid`
- `body text`
- `status enum(open, resolved)`
- `created_at timestamptz`
- `resolved_at timestamptz null`

#### suggestions
- `id uuid pk`
- `book_id uuid`
- `node_id uuid`
- `block_id uuid`
- `range_anchor jsonb`
- `original_content jsonb`
- `suggested_content jsonb`
- `source enum(human, ai)`
- `created_by uuid null`
- `ai_generation_id uuid null`
- `status enum(pending, accepted, rejected)`
- `created_at timestamptz`
- `decided_at timestamptz null`

### Sources and evidence

#### sources
- `id uuid pk`
- `organization_id uuid`
- `book_id uuid`
- `source_type enum(pdf, docx, text, markdown, webpage, audio, image, note, other)`
- `title text`
- `author text null`
- `publisher text null`
- `published_at date null`
- `url text null`
- `doi text null`
- `metadata jsonb`
- `ingestion_status enum(pending, processing, ready, failed)`
- `created_by uuid`
- `created_at timestamptz`

#### source_files
- `id uuid pk`
- `source_id uuid`
- `storage_path text`
- `mime_type text`
- `size_bytes bigint`
- `sha256 text`
- `created_at timestamptz`

#### source_chunks
- `id uuid pk`
- `source_id uuid`
- `sequence integer`
- `location jsonb`
- `text text`
- `token_count integer null`
- `embedding vector null`
- `content_hash text`

`location` must preserve enough information to identify the original page/section/timecode when available.

#### claims
- `id uuid pk`
- `book_id uuid`
- `node_id uuid`
- `block_id uuid`
- `anchor jsonb`
- `claim_text text`
- `status enum(needs_review, supported, partially_supported, disputed, unsupported, stale, author_experience, legal_review)`
- `confidence numeric null`
- `last_verified_at timestamptz null`
- `last_verified_by uuid null`
- `created_at timestamptz`
- `updated_at timestamptz`

#### claim_evidence
- `id uuid pk`
- `claim_id uuid`
- `source_chunk_id uuid`
- `relationship enum(supports, partially_supports, contradicts, context)`
- `note text null`
- `created_by uuid`
- `created_at timestamptz`

A model-generated verification cannot mark a claim supported unless evidence rows exist and the verification contract passes.

### Citations

#### citations
- `id uuid pk`
- `book_id uuid`
- `source_id uuid`
- `node_id uuid`
- `block_id uuid`
- `anchor jsonb`
- `locator text null`
- `prefix text null`
- `suffix text null`
- `created_at timestamptz`

#### bibliography_entries
Can be derived from sources and citation overrides. If persisted, must retain source identity.

- `id uuid pk`
- `book_id uuid`
- `source_id uuid`
- `csl_json jsonb`
- `updated_at timestamptz`

### Versioning

#### revision_events
Fine-grained append-only change metadata.

- `id uuid pk`
- `book_id uuid`
- `node_id uuid`
- `actor_user_id uuid null`
- `actor_type enum(human, ai, system)`
- `operation text`
- `before_hash text null`
- `after_hash text`
- `patch jsonb null`
- `ai_generation_id uuid null`
- `created_at timestamptz`

#### snapshots
- `id uuid pk`
- `book_id uuid`
- `name text`
- `description text null`
- `snapshot_type enum(named, publication_candidate, release)`
- `manifest jsonb`
- `created_by uuid`
- `created_at timestamptz`

Snapshot `manifest` records exact manuscript node versions/content hashes needed to reconstruct the book.

### AI provenance

#### ai_generations
- `id uuid pk`
- `organization_id uuid`
- `book_id uuid null`
- `node_id uuid null`
- `actor_user_id uuid`
- `operation_type text`
- `provider text`
- `model text`
- `prompt_version text`
- `input_manifest jsonb`
- `source_refs jsonb`
- `output jsonb`
- `disposition enum(pending, accepted, partially_accepted, rejected, informational)`
- `accepted_output jsonb null`
- `input_tokens bigint null`
- `output_tokens bigint null`
- `cost_microunits bigint null`
- `latency_ms integer null`
- `created_at timestamptz`

`input_manifest` should reference manuscript/source IDs and hashes rather than duplicating large protected text where possible.

### Editions and publishing

#### editions
- `id uuid pk`
- `book_id uuid`
- `edition_name text`
- `edition_number integer`
- `format enum(paperback, hardcover, epub, audiobook, other)`
- `language text`
- `trim_width numeric null`
- `trim_height numeric null`
- `paper_config jsonb`
- `design_config jsonb`
- `isbn text null`
- `publication_date date null`
- `price_config jsonb`
- `status enum(draft, preflight, ready, published, retired)`
- `created_at timestamptz`

#### publication_metadata
- `edition_id uuid pk`
- `title text`
- `subtitle text null`
- `description text`
- `short_description text null`
- `keywords text[]`
- `bisac_codes text[]`
- `contributors jsonb`
- `rights jsonb`
- `territories jsonb`
- `disclosures jsonb`
- `updated_at timestamptz`

#### publication_releases
Immutable release tied to a snapshot.

- `id uuid pk`
- `edition_id uuid`
- `snapshot_id uuid`
- `release_number integer`
- `status enum(generating, validated, failed, superseded)`
- `created_by uuid`
- `created_at timestamptz`
- unique `(edition_id, release_number)`

#### edition_files
- `id uuid pk`
- `release_id uuid`
- `file_type enum(docx, epub, print_pdf, reader_pdf, metadata, provenance_report, validation_report, cover)`
- `storage_path text`
- `sha256 text`
- `size_bytes bigint`
- `validation_status enum(pending, valid, invalid, warning)`
- `created_at timestamptz`

### ISBN records

#### isbn_records
- `id uuid pk`
- `organization_id uuid`
- `book_id uuid`
- `edition_id uuid null`
- `isbn text`
- `source enum(author_owned, free_platform, other)`
- `publisher_name text null`
- `assigned_at timestamptz null`
- `metadata jsonb`

The MVP guides ISBN acquisition/assignment. It does not buy identifiers on the user's behalf.

### Jobs

#### jobs
- `id uuid pk`
- `organization_id uuid`
- `actor_user_id uuid`
- `type text`
- `resource_type text`
- `resource_id uuid`
- `idempotency_key text`
- `status enum(queued, running, succeeded, failed, cancelled)`
- `attempts integer`
- `max_attempts integer`
- `progress jsonb`
- `error_code text null`
- `error_summary text null`
- `created_at timestamptz`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- unique `(organization_id, idempotency_key)`

## Authorization model

### Organization access
Every tenant-owned table must resolve to an `organization_id` directly or through an immutable foreign-key path.

### Book access
A user must both:
- belong to the organization, and
- have sufficient book permission when the resource is book-scoped.

Owner/admin organization roles may receive broader management rights only through explicit policy.

### Worker/service access
Service-role access bypasses RLS technically, so application code must enforce resource ownership before privileged mutations. Never accept arbitrary organization IDs from untrusted job payloads without verifying the job/resource relationship.

## Deletion/retention

Deletion must distinguish:
- account deletion
- organization deletion
- book deletion
- source deletion
- publication artifact retention
- audit/security records

Do not implement cascading hard deletes blindly. Published releases and compliance/security audit records may require a different retention policy than working manuscript content.

## Indexing priorities

Expected indexes include:
- organization membership lookup
- book membership lookup
- manuscript nodes `(book_id, parent_id, position)`
- source chunks `(source_id, sequence)`
- claims `(book_id, status)`
- citations `(book_id, source_id)`
- jobs `(status, created_at)`
- revisions `(node_id, created_at desc)`
- vector index for `source_chunks.embedding` when semantic retrieval ships
- full-text indexes for searchable source/manuscript projections

## Data invariants to test

1. Cross-organization reads/writes fail.
2. Viewer/reviewer cannot publish or mutate prohibited content.
3. Claims cannot reference blocks from another book.
4. Evidence cannot cross book/source ownership boundaries.
5. Release snapshot and edition must belong to the same book.
6. Publication release rows/files are immutable after validation except status transitions explicitly allowed by contract.
7. AI generation records cannot be reassigned across organizations.
8. Deleting a source with active citations/evidence requires an explicit resolution path.
9. Stable block IDs remain unique within the canonical manuscript and survive ordinary edits.
10. Retried jobs cannot create duplicate releases or double-meter the same generation.
