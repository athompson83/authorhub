# Textbook workflow

AuthorHub provides a single-author textbook authoring and publication-file workflow. Books, manuscript history, edition settings, sources and release files live in Supabase with server-enforced tenant policies. Hosting status and deployment steps are recorded in [Deployment](DEPLOYMENT.md).

## Using AuthorHub

1. Create an account and confirm your email when requested. Password recovery is available from sign-in.
2. Create a book in Library, or import a release backup or plain-text manuscript. A backup restores into a **new** editable book with new identities; it does not overwrite another book.
3. Add and order front matter, parts, chapters, sections and back matter. Edit with headings, quotations, lists, tables, figures, equations, notes and source citations. Add bibliographic records in the chapter's Source library.
4. Watch the save status. Autosaves serialize changes and reject stale versions. Pending navigation is guarded; failed saves retain the latest in-memory draft for retry or download. Automatic revisions, named snapshots, text comparison and restoration are available under History. Restoring creates another revision.
5. Open **Cover, interior & publish**. Create an edition, enter its author and publication metadata, and configure the interior and cover. Save the edition before freezing a release.
6. Resolve readiness issues and freeze a publication copy. Download EPUB, DOCX, interior PDF, cover PDF, printable interior HTML, cover-wrap HTML or a complete release backup from that immutable copy.
7. Review the generated files and upload them to your printer or distributor. Retailer submission is performed by the author.

The edition controls include ISBN-13 validation; trim; margins and inside gutter; fonts; paragraph spacing/indent; headings; running headers; contents; page numbers; front/back artwork and opacity; background/text colors; title alignment, size and placement; back/spine copy, sizes and placement; spine width; bleed; and an optional EAN-13 ISBN barcode. Use your printer's paper, binding and final-page-count specification for spine width.

Book settings support metadata changes and reversible archive/restore. Owners can permanently delete a book after typing its current title. This removes all collaborators' manuscript, history, sources, editions and releases, and schedules private-file removal. Failed cleanup remains visible and retriable in Account settings. Download backups first. Account deletion requires password verification, no owned books and no pending file cleanup. Shared workspaces must have another owner. Account removal preserves anonymous UUID attribution in other authors' shared revision history.

## Storage and version control

Canonical content is chapter-scoped semantic data with stable block identities. The block index and citation records are derived from that canonical representation. Ordinary edits preserve identities; copied/pasted blocks, notes and citations receive new identities. Source and edition updates use optimistic versions, as do chapter content and structural edits.

History lists the newest 100 saved revisions and 100 named snapshots without loading their full content. Selected comparisons fetch one document. Older automatic revisions remain stored. Named snapshots can be restored independently of the automatic revision window.

Artwork is uploaded directly to a private bucket, with a 20 MB per-image limit, image decoding, dimensions and SHA-256. Only PNG/JPEG are accepted. Editor URLs expire; canonical documents retain private asset identities. Frozen releases capture book metadata, canonical chapter versions, sources, edition settings and the artwork manifest in one database snapshot. Rendering reads verified frozen bytes rather than the working draft.

Every export has a persisted job, an exclusive lease and an immutable private artifact with hash and size. Downloads use short-lived signed URLs. Repeated downloads reuse archived bytes. Interrupted attempts can be resumed after a five-minute lease; each source release/format has at most three attempts. Files are limited to 50 MB. The web renderer uses packaged Chromium within a 300-second execution budget. Large image-heavy books may need smaller artwork or separate volumes.

## Local setup

Use Node 24 and pnpm 10.15.0:

```sh
corepack pnpm install --frozen-lockfile
npx supabase start
```

Apply all migrations to your local instance. Copy the API URL and publishable key from `supabase status` into ignored `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<Supabase API URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Only these two public values are required by the web app. Never expose a service-role key to Next or the browser. Start the account lifecycle Edge Function separately when using deletion controls:

```sh
npx supabase functions serve account-lifecycle
corepack pnpm dev
```

The function obtains its administrative credentials from Supabase's injected environment. It independently validates every caller through Auth.getUser; PostgreSQL checks owner access and typed confirmation. Administrative access is restricted to private cleanup and Auth identity removal. See the deployment guide before using a hosted instance.

## Verification

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:database
corepack pnpm exec playwright test
```

The database script uses an explicitly named disposable PostgreSQL container (`authorhub-test-db`, or `AUTHORHUB_TEST_CONTAINER`), creates its own temporary database, replays every migration, tests both positive and negative authorization, and removes that database. The minimal Auth/Storage catalogs in `supabase/tests/bootstrap.sql` are **only** for this PostgreSQL policy test, never for hosted deployment.

The browser suite requires a running app and disposable real Auth, PostgreSQL, PostgREST and Storage services with email auto-confirmation. Set `AUTHORHUB_TEST_URL`, `AUTHORHUB_TEST_SUPABASE_URL` and `AUTHORHUB_TEST_SUPABASE_KEY`. It creates synthetic accounts and books. The account-lifecycle function must be running. Do not run this suite against production.

To exercise the actual lifecycle handler against disposable Auth and Storage, additionally provide `AUTHORHUB_TEST_SERVICE_KEY` only to the test process and run `node scripts/test-account-lifecycle.mjs`. Never commit that value.

Locally verified on 2026-11-22 using Node 24.22.3 / pnpm 10.15.0:

- Workspace typecheck, lint, production build and unit tests; full migration replay and positive/negative tenancy, CAS, history, release, citation, artwork, artifact lease and deletion tests.
- Browser journey: write/reload, artwork, table, equation, note, citation, source record, snapshot, compare/restore, conflict response, edition settings, frozen release, all seven downloads, mobile width, backup import, archive/restore and sign-out. Permanent deletion is covered by the real-service lifecycle integration and browser journey.
- EPUBCheck 5.3.0: no errors or warnings on the exported book with embedded artwork, MathML, notes and citations.
- Server PDF geometry inspected with `pdfinfo`: interior 504 × 720 pt (7 × 10 inches); cover 1062 × 738 pt (14.75 × 10.25 inches). Tagged PDFs are generated using the same packaged Chromium binary intended for hosting.
- Independent barcode decoding from a rendered cover PDF recovered ISBN 9780306406157.
- A 100,000-word manuscript rendered successfully; independent text extraction found all 100,000 expected words and the final manuscript marker.
- Real Auth/Storage lifecycle integration: authentication failures, outsider/owner boundaries, title confirmation, nested private file removal, idempotent cleanup retry, refusal to delete an account owning books and successful Auth account removal.

Local checks do not establish hosted configuration, actual delivery of production auth emails, printer acceptance or distributor certification.

## Format details and remaining boundaries

- Interior and cover PDFs are generated on the server. Review printer templates before manufacture. PDF/X, CMYK conversion, crop marks, licensed custom font uploads and printer-specific certification are not provided.
- EPUB is reflowable. Print typography, page numbers and full-wrap cover geometry apply to print output. EPUB equations use MathML; reader support varies.
- DOCX uses editable Office Math, native numbered/bulleted lists, Word footnotes, a bibliography, running headers and page-number footers. Word/LibreOffice can repaginate it. Complex merged tables require visual review.
- Notes appear as endnotes in PDF/HTML and semantic linked notes in EPUB. They are native footnotes in Word. Bibliographic records and numbered source citations are supported; automated source ingestion, evidence verification, citation-style switching, cross-reference management and tracked suggestions are not implemented.
- Compare shows text differences; it does not visualize artwork or formatting changes. Drafts are protected during the session, but offline editing and recovery after a browser crash are not implemented. Save before closing the browser.
- This release focuses on the author-owned textbook workflow. Collaborator invitation/ownership-transfer UI, AI authoring, billing and royalty/retailer automation are not available. Existing role policies protect shared data, but account deletion may require an administrator to transfer ownership when using shared workspaces configured outside the UI.

## Dependency decisions

`docx` produces Office Open XML and `fflate` creates EPUB containers; neither introduces another manuscript model. TipTap mathematics uses KaTeX for editing and validation; exports derive MathML and Office Math from the same LaTeX. XML conversion uses a maintained XML parser. Packaged Chromium and Playwright Core supply reproducible server-side paged rendering; the browser suite independently checks the resulting files. Background tasks and frozen artifacts are persisted so retries do not overwrite release bytes.
