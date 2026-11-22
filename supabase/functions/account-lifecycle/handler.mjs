const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
};
const respond = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dependency injection lets the very same handler exercise real disposable
// Auth, PostgREST and Storage services without a deployed privileged endpoint.
export function createLifecycleHandler({
  createClient,
  url,
  anonKey,
  serviceKey,
}) {
  return async function handle(request) {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return respond({ error: "POST required." }, 405);
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      return respond({ error: "Sign in required." }, 401);
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await caller.auth.getUser(authorization.slice(7));
    if (authError || !user) return respond({ error: "Sign in required." }, 401);
    let body;
    try {
      body = await request.json();
    } catch {
      return respond({ error: "Invalid request." }, 400);
    }
    if (!body || typeof body !== "object")
      return respond({ error: "Invalid request." }, 400);
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      if (body.action === "account") {
        if (
          !user.last_sign_in_at ||
          Date.now() - Date.parse(user.last_sign_in_at) > 300000
        )
          return respond(
            { error: "Sign in again before deleting your account." },
            403,
          );
        const { error } = await caller.rpc("prepare_account_deletion", {
          p_confirmation: body.confirmation,
        });
        if (error)
          return respond(
            {
              error:
                error.code === "22023"
                  ? error.message
                  : "Account deletion denied.",
            },
            400,
          );
        // Soft-delete Auth identity to retain anonymous attribution in shared work.
        const { error: deletionError } = await admin.auth.admin.deleteUser(
          user.id,
          true,
        );
        if (deletionError) throw deletionError;
        return respond({ deleted: true });
      }
      let taskId = body.taskId;
      if (body.action === "book" && uuid.test(body.bookId ?? "")) {
        const { data, error } = await caller.rpc("request_book_deletion", {
          p_book_id: body.bookId,
          p_confirmation: body.confirmation,
        });
        if (error)
          return respond(
            {
              error:
                error.code === "22023"
                  ? error.message
                  : "Book deletion denied.",
            },
            403,
          );
        taskId = data;
      } else if (body.action !== "cleanup" || !uuid.test(taskId ?? "")) {
        return respond({ error: "Invalid deletion request." }, 400);
      }
      const { data: task, error } = await admin
        .from("book_deletion_tasks")
        .select("id,book_id,requested_by,completed_at")
        .eq("id", taskId)
        .eq("requested_by", user.id)
        .single();
      if (error || !task || !uuid.test(task.book_id))
        return respond({ error: "Deletion unavailable." }, 404);
      if (!task.completed_at) {
        try {
          for (const bucketName of ["book-assets", "publication-artifacts"]) {
            const bucket = admin.storage.from(bucketName);
            // Delete each returned batch before listing again: offsets would skip
            // items after deletion. Never traverse outside this book's UUID prefix.
            async function clean(prefix) {
              while (true) {
                const { data: entries, error: listError } = await bucket.list(
                  prefix,
                  { limit: 100 },
                );
                if (listError) throw listError;
                if (!entries?.length) return;
                const files = [];
                for (const entry of entries) {
                  if (
                    !entry.name ||
                    entry.name.includes("/") ||
                    entry.name === "." ||
                    entry.name === ".."
                  )
                    throw new Error("invalid storage name");
                  const path = `${prefix}/${entry.name}`;
                  if (entry.id) files.push(path);
                  else await clean(path);
                }
                if (files.length) {
                  const { error: removeError } = await bucket.remove(files);
                  if (removeError) throw removeError;
                }
              }
            }
            await clean(task.book_id);
          }
          const { error: completeError } = await admin
            .from("book_deletion_tasks")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", task.id);
          if (completeError) throw completeError;
        } catch {
          return respond(
            { deleted: true, cleanupPending: true, taskId: task.id },
            202,
          );
        }
      }
      return respond({ deleted: true, taskId: task.id });
    } catch {
      // Do not log protected manuscript content, access tokens or provider bodies.
      return respond(
        { error: "Unable to finish deletion. Retry from account settings." },
        503,
      );
    }
  };
}
