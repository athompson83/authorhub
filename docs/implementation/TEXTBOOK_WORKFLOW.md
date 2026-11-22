# Textbook workflow implementation

## Implemented

This branch extends `foundation/authorhub-product-architecture`. The default branch was documentation-only; the application is Next.js, React, TipTap and Supabase, retaining chapter-scoped canonical content and server-enforced access rules.

- Sign in, create books and chapters, write with headings, emphasis, quotations, ordered/bulleted lists, code, tables and PNG/JPEG figures with required alt text.
- Stable block IDs are assigned in the live editor; pasted blocks receive fresh identities so copying between chapters does not collide with the global block index. Saves are serialized, queued edits are coalesced, failures retain the latest draft for retry, and stale saves return HTTP 409. Unsaved drafts can be downloaded; navigation is guarded while changes are pending.
- Rename chapters, change front/part/chapter/section/back matter type, and move chapters earlier/later. Structural edits use optimistic versions and serialize ordering changes.
- Automatic append-only saved revisions, named snapshots, side-by-side text comparison, and restore as a new revision. The panel displays the newest 100 revisions and 100 named snapshots; older revisions remain in the database. Named snapshots can be compared/restored independently of that revision window. Refresh after writing before restoring or changing chapter settings.
- Multiple editions with independently saved metadata, ISBN-13 checksum validation, trim, margins, inside gutter, typography, paragraph spacing/indent, heading color, running header, contents and page-number settings.
- Cover background/text colors, title size/alignment, front/back artwork and opacity, back copy, spine copy/width and bleed. Text is escaped and uploaded images stay private inside edition/release data. PNG/JPEG uploads are limited to 2 MB each. External images and SVG are not accepted.
- Immutable publication copies freeze book metadata, canonical chapter versions/content and edition settings in one database operation. Automatic history, snapshots and publication copies cannot be updated by ordinary application users. Releases never read the subsequent working draft.
- EPUB 3, DOCX, print-interior HTML, cover-wrap HTML and complete release JSON downloads. HTML uses paged CSS and can be printed to PDF in a browser. All formats derive from the canonical manuscript.
- Edition edits reject stale versions. Removed workspace members cannot continue using retained book memberships.

## Local setup

Use Node 22 or later and the pinned pnpm version in `package.json`:

```sh
corepack pnpm install --frozen-lockfile
npx supabase start
```

Copy the local Supabase API URL and publishable key from `supabase status` into `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<your-local-or-staging-Supabase-URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

These two public values are consumed by browser and server Supabase clients. Never use a service-role key here. Apply all checked-in migrations to a disposable or staging project before running the app. Standard local `supabase start` initializes migrations; use the CLI's documented reset command when rebuilding a local database. No hosted project is linked or changed by this implementation.

```sh
corepack pnpm dev
```

Open `/sign-up`, create an account, then Library → Create book → Add chapter. Open **Cover, interior & publish** to configure an edition. Save it, open **Release**, freeze a publication copy, choose it and download exports.

## Verification

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm exec playwright test
```

The browser test uses a running app and disposable Supabase with email auto-confirmation enabled. Configure `AUTHORHUB_TEST_URL`, `AUTHORHUB_TEST_SUPABASE_URL` and `AUTHORHUB_TEST_SUPABASE_KEY` to point to that disposable environment. It creates synthetic accounts and books. Do not run it against production.

A smaller PostgreSQL-only migration/RLS test is available when the complete Supabase image exceeds local resources:

```sh
docker run -d --name authorhub-test-db -e POSTGRES_PASSWORD=local-test-only postgres:17-alpine
scripts/test-database.sh
```

The script creates and removes its own disposable database, supplies only the Auth schema needed for policy tests, applies every migration in order and checks positive/negative read/write, version, history and release behavior. It does not substitute for Auth integration testing. `AUTHORHUB_TEST_CONTAINER` changes the target container.

The browser test exercises real Auth/PostgREST/PostgreSQL services, writes/reloads a chapter, persists a table and an image with alt text, snapshots and restores revisions, checks an HTTP 409, saves edition settings, freezes a release and downloads all five formats. It also renders the two HTML exports with Chromium's PDF engine and checks mobile overflow. EPUB downloads should additionally be checked with W3C EPUBCheck.

## Deliberate limits / release gates

This is an authoring and publication-file workflow, **not a production-complete publishing platform**. No live deployment, retailer submission, payments, hosted project provisioning or manuscript publication has occurred.

- PDF output currently requires browser Print → Save as PDF. Browser/version/font differences affect pagination. Use 100% scale, document paper size, background graphics enabled and browser headers/footers disabled. Check the generated result against the printer's template; PDF/X, CMYK, embedded licensed fonts, crop marks and printer certification are not implemented.
- Spine width is entered from the printer's paper/binding/final-page-count specification. No automatic spine formula or ISBN barcode generation is claimed. Cover wrap bleed expands the outer sheet; critical text is inset. Dedicated printer preflight and full-bleed artwork positioning require a later rendering slice.
- EPUB is reflowable; print typography/page-number/cover-wrap geometry does not apply. DOCX is an editorial handoff and can repaginate in Word/LibreOffice. DOCX lists currently use visible list markers; complex merged table fidelity is not guaranteed.
- Exports run in the user's browser, with no server render queue or artifact storage. Frozen source/config data is immutable; generated file bytes are not archived as immutable artifacts. Large image-heavy books need a durable worker/storage pipeline and image deduplication before production release. DOCX timestamps can vary between downloads.
- Plain-text comparison does not visualize changes to image artwork, table layout, or text formatting. Editing supports the listed schema primitives; native equations, footnotes, cross-references, citation management, tracked suggestions and source/evidence ingestion remain unimplemented. Authors can write references/front/back matter manually.
- Bulk import, release-backup restore, collaborator invitation UI, password recovery UI, offline draft recovery, account/book deletion UI, billing and production observability remain future work. Do not imply these are functional in marketing.
- A dedicated release-readiness audit still needs backup/recovery, account lifecycle, large-book load, browser coverage, accessibility, dependency/security review and printer-specific validation before public launch.

## Dependency decisions

TipTap image/table extensions use the existing editor model. `fflate` writes an actual EPUB ZIP container (mimetype first and uncompressed) and embeds figure assets; browsers have no native ZIP writer. `docx` produces Office Open XML without maintaining an editable second manuscript. Playwright verifies the critical browser journey and the print boundary. These additions avoid introducing a second editor, server renderer or unrelated service.

## Verification record — 2026-11-22

Locally verified on Node 24.22.3 / pnpm 10.15.0:

- Frozen lockfile install, workspace typecheck/lint/build: passed. Build was also exercised with empty Supabase environment values so CI does not need production credentials.
- 22 Vitest tests across auth, canonical manuscript and web feature packages: passed. Coverage includes queued autosaves/failure recovery, fresh pasted identities, structured validation, ISBN, escaping, EPUB ZIP structure and DOCX content/geometry.
- All migrations replayed in PostgreSQL 17 and publishing RLS/history/release tests: passed. A real failure from implicit default write grants was reproduced, then explicit revocations were verified.
- Playwright Chromium 145 full textbook journey with real local GoTrue + PostgREST + PostgreSQL: passed. The full Supabase Docker image exceeded the environment's unpacking limit, so the smaller services were used for the browser integration. Browser connector tooling was unavailable; Playwright provided browser interaction and screenshots.
- EPUBCheck 5.3.0 on the browser-downloaded EPUB containing a table and embedded figure: zero errors and zero warnings.
- Chromium PDF renders independently inspected with `pdfinfo`: interior 504 × 720 pt (7 × 10 in), three fixture pages; cover 1062 × 738 pt (14.75 × 10.25 in), one page. This verifies fixture geometry, not printer certification.
- Desktop cover spread and 390 px mobile studio screenshots visually inspected. Fixed cover-preview clipping; verified full spread, readable labels, tab/selection state, unchanged design palette and mobile page width. No generated concept was used because this extends the existing design.

Hosted deployment, hosted migrations, CI results and printer/distributor approval are not established by these local checks.
