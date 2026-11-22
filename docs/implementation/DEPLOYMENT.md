# AuthorHub deployment

## Current provisioning status

The Vercel project `authorhub` has been prepared in the connected `paramedicine101-9167s-projects` team. It uses Node 24, the `apps/web` root, pnpm's frozen lockfile and a 300-second function budget. No production deployment is claimed here.

A dedicated Supabase project is required. The working connection opens the **Valor** organization, whose quoted project cost is **$10/month**. Provisioning is waiting for the owner's explicit approval of this charge, as required by the provider tool. Unrelated existing Supabase projects must not be repurposed.

## Provision and configure

1. Create a dedicated Authorhub project after cost approval. Wait for ACTIVE_HEALTHY. Inspect its empty application schema, then apply **all** versioned migrations under `supabase/migrations` in filename order with the migration tool/CLI. Never run the disposable `supabase/tests/bootstrap.sql` against it.
2. Deploy `supabase/functions/account-lifecycle` with its checked-in configuration. Legacy gateway JWT validation is disabled because the handler validates every token with Auth.getUser itself. Supabase injects administrative credentials into this function; do not add those credentials to Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel's production environment, and preview only when explicitly pointing previews at the correct isolated backend. Never expose a service-role key.
4. Configure Supabase Auth's Site URL to the chosen production HTTPS origin. Allow its exact `/auth/callback` URL, including the recovery callback pattern required by the password reset flow. Use a production-capable SMTP configuration and verify confirmation/recovery delivery to the owner's real address. Default provider mail limits and recipient restrictions must be assessed before enabling external self-service signups.
5. Set an appropriate password policy (the UI requires 12 characters). Enable email confirmation, keep refresh-token rotation, disable anonymous sign-in, and retain rate limits. Run the provider's database/security advisors and resolve actionable findings for this schema.
6. Deploy the tested Git commit to production with framework Next.js, root `apps/web`, install `pnpm install --frozen-lockfile`, build `pnpm --filter @authorhub/web build`, source files outside root enabled, Node `24.x` and function timeout 300. Verify that Chromium's binary assets appear in the traced server function. Production must be accessible while preview protection remains enabled.

## Hosted acceptance

Check the deployed commit matches the tested source. Confirm the landing page loads, private pages redirect to sign-in, and private APIs reject unauthenticated requests. In a disposable staging backend, run the full browser and lifecycle suites before production promotion. Verify provider logs without printing manuscript bodies or tokens.

Using the production origin, confirm the owner can register/confirm/sign in, reset a password, create and save a chapter, reload it, configure an edition, freeze a release, download both PDFs and EPUB, and restore a release backup into a new book. Verify private artwork and release links are inaccessible without authorization or an unexpired signed URL. Test deletion only on clearly marked synthetic data.

After acceptance, record the exact commit, deployment ID, live URL, Supabase migration list, email configuration verification and test results. Configure monitoring for failed export attempts, provider limits and backup retention. Confirm the selected Supabase plan's backup/recovery settings and perform a restore exercise before trusting the instance with the only copy of a manuscript. Authors should also retain self-contained release backups.

## Recovery

Vercel application rollback must use a previously verified deployment compatible with the current append-only database schema. Do not roll back database migrations destructively. Publication artifacts are immutable and can be downloaded again. Export retries reclaim expired leases after five minutes and reuse previously stored bytes. Failed private-file cleanup is retained as a task in Account settings and can be retried safely.
