# AuthorHub Security Model

## Security posture

AuthorHub stores unreleased manuscripts, proprietary research, unpublished source material, and publishing credentials. Treat this as high-value intellectual property.

## Core controls

- deny by default
- least privilege
- explicit organization and book membership
- server-side authorization
- PostgreSQL RLS for tenant-owned data
- signed object-storage URLs
- short-lived download access for generated files
- strict secret management
- audit sensitive mutations
- no protected content in analytics/logs
- verified webhook signatures
- environment isolation
- backups and tested recovery

## Tenant isolation

Every tenant-owned row must resolve to exactly one organization. Book-scoped resources must additionally verify book access.

Negative tests are required for:
- cross-organization reads
- cross-organization writes
- guessed UUID access
- role escalation
- viewer/reviewer mutation
- unauthorized source downloads
- unauthorized export downloads
- worker job payload tampering

## Storage

Use private buckets for:
- manuscripts when files are imported/exported
- source files
- cover assets not explicitly public
- generated publication files
- audiobook assets in future

Never rely on an unguessable URL as authorization.

## AI provider data

Before production use, each provider must have a documented data-use/retention decision. Send only the content necessary for the operation. Do not opt users into provider training.

## Logging

Allowed:
- IDs
- safe event names
- byte/token counts
- content hashes
- provider/model identifiers
- latency
- safe error codes

Avoid:
- manuscript paragraphs
- source bodies
- full prompts containing protected text
- access tokens
- signed URLs
- personal payment data

## Publishing credentials

MVP should not store retailer passwords. Future distributor/provider connections must use OAuth/API credentials where supported and encrypted secret storage.

Do not automate retailer logins through stored usernames/passwords or browser impersonation.

## Export and deletion

Users must have a path to export their manuscript and project data. Deletion workflows must explicitly address backups, immutable release artifacts, audit records, and legal/security retention requirements rather than promising instant physical erasure everywhere.

## Security release gate

Changes affecting auth, RLS, storage, sharing, jobs, webhooks, billing, AI context, or publication artifacts require:
- positive authorization tests
- negative authorization tests
- migration review where applicable
- secret/logging review
- abuse/failure-mode review

## Threats to design for

- cross-tenant data leakage
- malicious collaborator privilege escalation
- prompt injection embedded in imported sources
- source file malware/parser abuse
- oversized/decompression-bomb uploads
- export URL leakage
- webhook replay
- job replay/double charging
- malicious HTML/metadata in imported content
- SSRF through webpage import
- dependency/supply-chain compromise
- accidental provider training/retention
- destructive AI overwrite
- unauthorized publication action in future
