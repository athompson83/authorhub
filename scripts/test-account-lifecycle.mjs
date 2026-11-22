// Integration test: use only an explicitly configured disposable Supabase.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { createLifecycleHandler } from "../supabase/functions/account-lifecycle/handler.mjs";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { createClient } = require("@supabase/supabase-js");
const url = process.env.AUTHORHUB_TEST_SUPABASE_URL;
const anonKey = process.env.AUTHORHUB_TEST_SUPABASE_KEY;
const serviceKey = process.env.AUTHORHUB_TEST_SERVICE_KEY;
assert(
  url && anonKey && serviceKey,
  "Explicit disposable Auth/Storage credentials required.",
);
const handle = createLifecycleHandler({
  createClient,
  url,
  anonKey,
  serviceKey,
});
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function account() {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `lifecycle-${crypto.randomUUID()}@example.test`,
    password: "Disposable-Password-123!",
  });
  assert.ifError(error);
  assert(data.session);
  return { client, user: data.user, token: data.session.access_token };
}
async function call(token, body) {
  return handle(
    new Request("https://example.test/account-lifecycle", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}
const owner = await account(),
  outsider = await account();
assert.equal(
  (await handle(new Request("https://example.test", { method: "POST" })))
    .status,
  401,
);
assert.equal((await call("invalid-token", {})).status, 401);
const { data: memberships } = await owner.client
  .from("organization_memberships")
  .select("organization_id");
const bookId = crypto.randomUUID();
assert.ifError(
  (
    await owner.client.from("books").insert({
      id: bookId,
      organization_id: memberships[0].organization_id,
      title: "Disposable lifecycle book",
      created_by: owner.user.id,
    })
  ).error,
);
const file = await readFile(
  new URL("../tests/fixtures/figure.png", import.meta.url),
);
for (const bucket of ["book-assets", "publication-artifacts"]) {
  assert.ifError(
    (
      await admin.storage
        .from(bucket)
        .upload(
          `${bookId}/nested/fixture.${bucket === "book-assets" ? "png" : "json"}`,
          bucket === "book-assets" ? file : Buffer.from("{}"),
          {
            contentType:
              bucket === "book-assets" ? "image/png" : "application/json",
          },
        )
    ).error,
  );
}
assert.equal(
  (
    await call(outsider.token, {
      action: "book",
      bookId,
      confirmation: "Disposable lifecycle book",
    })
  ).status,
  403,
);
assert.equal(
  (await call(owner.token, { action: "book", bookId, confirmation: "wrong" }))
    .status,
  403,
);
assert.equal(
  (
    await call(owner.token, {
      action: "account",
      confirmation: "DELETE MY ACCOUNT",
    })
  ).status,
  400,
);
const response = await call(owner.token, {
  action: "book",
  bookId,
  confirmation: "Disposable lifecycle book",
});
const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result));
assert(result.deleted && !result.cleanupPending);
assert.equal(
  (await owner.client.from("books").select("id").eq("id", bookId)).data.length,
  0,
);
for (const bucket of ["book-assets", "publication-artifacts"]) {
  assert.equal((await admin.storage.from(bucket).list(bookId)).data.length, 0);
}
assert.equal(
  (await call(outsider.token, { action: "cleanup", taskId: result.taskId }))
    .status,
  404,
);
assert.equal(
  (await call(owner.token, { action: "cleanup", taskId: result.taskId }))
    .status,
  200,
);
// An interrupted privileged cleanup must leave a visible, retriable task.
const retryBook = crypto.randomUUID();
assert.ifError(
  (
    await owner.client
      .from("books")
      .insert({
        id: retryBook,
        organization_id: memberships[0].organization_id,
        title: "Retry cleanup",
        created_by: owner.user.id,
      })
  ).error,
);
assert.ifError(
  (
    await admin.storage
      .from("book-assets")
      .upload(`${retryBook}/figure.png`, file, { contentType: "image/png" })
  ).error,
);
const interrupted = createLifecycleHandler({
  url,
  anonKey,
  serviceKey,
  createClient: (...args) => {
    const client = createClient(...args);
    if (args[1] !== serviceKey) return client;
    return new Proxy(client, {
      get(target, key) {
        if (key !== "storage") return Reflect.get(target, key);
        return {
          from: (bucketName) =>
            new Proxy(target.storage.from(bucketName), {
              get(bucket, property) {
                if (property === "remove")
                  return async () => ({
                    error: new Error("synthetic interruption"),
                  });
                const value = Reflect.get(bucket, property);
                return typeof value === "function" ? value.bind(bucket) : value;
              },
            }),
        };
      },
    });
  },
});
const pending = await interrupted(
  new Request("https://example.test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${owner.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "book",
      bookId: retryBook,
      confirmation: "Retry cleanup",
    }),
  }),
);
assert.equal(pending.status, 202);
const pendingBody = await pending.json();
assert(pendingBody.cleanupPending);
assert.equal(
  (
    await call(owner.token, {
      action: "account",
      confirmation: "DELETE MY ACCOUNT",
    })
  ).status,
  400,
);
assert.equal(
  (await call(owner.token, { action: "cleanup", taskId: pendingBody.taskId }))
    .status,
  200,
);
assert.equal(
  (await admin.storage.from("book-assets").list(retryBook)).data.length,
  0,
);
assert.equal(
  (
    await call(owner.token, {
      action: "account",
      confirmation: "DELETE MY ACCOUNT",
    })
  ).status,
  200,
);
assert.equal(
  (
    await call(owner.token, {
      action: "account",
      confirmation: "DELETE MY ACCOUNT",
    })
  ).status,
  401,
);
assert.equal(
  (
    await call(outsider.token, {
      action: "account",
      confirmation: "DELETE MY ACCOUNT",
    })
  ).status,
  200,
);
console.log(
  "Real Auth/Storage lifecycle integration passed: owner checks, typed confirmation, nested private file cleanup, idempotent retries and account removal.",
);
