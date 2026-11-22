# AuthorHub Architecture Decisions

This file indexes major product/architecture decisions. Detailed ADRs live in `docs/adr/`.

| ADR      | Decision                                                   | Status   |
| -------- | ---------------------------------------------------------- | -------- |
| ADR-0001 | Structured canonical manuscript with stable block IDs      | Accepted |
| ADR-0002 | Book and edition are separate domain entities              | Accepted |
| ADR-0003 | Source-grounded nonfiction is the MVP market wedge         | Accepted |
| ADR-0004 | Provider-neutral AI operations with full provenance        | Accepted |
| ADR-0005 | Long-running ingestion/AI/rendering work uses durable jobs | Accepted |
| ADR-0006 | One canonical manuscript feeds all export formats          | Accepted |
| ADR-0007 | Direct retailer automation is excluded from MVP            | Accepted |

## Decision discipline

Create an ADR when changing a decision that is expensive to reverse, affects multiple packages/services, changes data semantics, changes security boundaries, or materially changes product scope.

An ADR should state:

- context
- decision
- alternatives considered
- consequences
- migration/reversal considerations

Do not use ADRs for routine implementation details.

## Server publication exports

Use packaged Chromium through Playwright Core for semantic HTML/CSS-to-PDF rendering. Neither browser-only printing nor hand-positioned PDF prose satisfies direct, reproducible downloads. Persist export jobs, leased attempts, hashes, and immutable private Storage artifacts. Next's `after` starts the worker within a 300-second execution budget; interrupted leases can be retried after five minutes. Retries reuse stored bytes, and concurrent workers cannot complete another lease. Each worker uses the requesting author's authenticated, policy-constrained client rather than a service-role credential. Chromium and Playwright are isolated to the server bundle.

## Private artwork and cover production

Artwork is uploaded directly to private Supabase Storage, addressed by immutable asset identities and hashes, and resolved to short-lived signed URLs only for editing. Frozen releases capture the asset manifest; renderers embed verified source bytes. This avoids Vercel request-body limits for image-heavy textbooks and prevents live artwork replacements from changing historical releases. Cover rendering includes outer-sheet bleed, adjustable copy placement and an EAN-13 barcode for an author-assigned valid ISBN.

## Account lifecycle

Permanent book removal atomically deletes canonical data and records a private cleanup task. A dedicated Supabase Edge Function validates the caller with Auth, invokes owner-checked PostgreSQL operations, removes only the deleted book’s UUID-prefixed private files, and records completion. Interrupted cleanup is retriable from Account settings. The web application and renderer never receive service-role credentials. Account removal requires recent password verification, no owned books or pending cleanup, and another owner for shared workspaces. Auth identities are soft-deleted and shared attribution retains anonymous UUIDs rather than breaking collaborators’ history.

## Reproducible typography

Use unmodified, redistributable DejaVu and Liberation font files instead of assuming proprietary desktop fonts exist in a serverless runtime. Preview, server PDF and portable HTML use the same four regular/bold/italic faces; EPUB embeds them with their licenses. A downloadable font pack supports the same typography in Word. These static assets are included explicitly in export-function tracing.
