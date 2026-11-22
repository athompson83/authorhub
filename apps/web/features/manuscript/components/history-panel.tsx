"use client";
import { useEffect, useState } from "react";
import {
  extractBlockIndex,
  type ManuscriptDocument,
} from "@authorhub/manuscript";
type Revision = {
  id: string;
  version: number;
  title: string;
  created_at: string;
  content: ManuscriptDocument;
  source?: "revision" | "snapshot";
};
type Snapshot = {
  id: string;
  name: string;
  created_at: string;
  payload: { version: number; content: ManuscriptDocument; title: string };
};
const plain = (doc: ManuscriptDocument) =>
  extractBlockIndex(doc)
    .map((b) => b.textContent)
    .join("\n\n");
export function HistoryPanel({
  nodeId,
  current,
  currentVersion,
}: {
  nodeId: string;
  current: ManuscriptDocument;
  currentVersion: number;
}) {
  const [revisions, setRevisions] = useState<Revision[]>([]),
    [snapshots, setSnapshots] = useState<Snapshot[]>([]),
    [selected, setSelected] = useState<Revision | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch(`/api/manuscript/nodes/${nodeId}/history`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setRevisions(data.revisions);
    setSnapshots(data.snapshots);
  }
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/manuscript/nodes/${nodeId}/history`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setRevisions(data.revisions);
          setSnapshots(data.snapshots);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("History could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);
  async function act(input: object) {
    if (
      !window.dispatchEvent(
        new Event("authorhub:before-action", { cancelable: true }),
      )
    ) {
      setMessage("Wait for the draft to save, then try again.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/manuscript/nodes/${nodeId}/history`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if ("version" in data) window.location.reload();
      else {
        await load();
        setMessage("Snapshot saved.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "History update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="history-panel">
      <h2>Version history</h2>
      <p className="muted">
        Every saved revision is retained. Restore creates a new version. Save
        the editor before taking a snapshot or restoring.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = new FormData(form).get("name");
          void act({ action: "snapshot", name });
        }}
      >
        <label>
          Snapshot name
          <input name="name" required maxLength={200} />
        </label>
        <button className="button" disabled={busy}>
          Save snapshot
        </button>
      </form>
      <p role="status">{message}</p>
      <button
        type="button"
        className="button"
        onClick={() => window.location.reload()}
      >
        Refresh history
      </button>
      <h3>Snapshots</h3>
      {snapshots.length ? (
        snapshots.map((s) => (
          <p key={s.id}>
            <button
              type="button"
              className="button"
              onClick={() =>
                setSelected({
                  id: s.id,
                  version: s.payload.version,
                  content: s.payload.content,
                  title: s.payload.title,
                  created_at: s.created_at,
                  source: "snapshot",
                })
              }
            >
              {s.name} · version {s.payload.version}
            </button>
          </p>
        ))
      ) : (
        <p className="muted">No named snapshots yet.</p>
      )}
      <h3>Saved revisions</h3>
      <select
        aria-label="Compare revision"
        value={selected?.source === "snapshot" ? "" : (selected?.id ?? "")}
        onChange={(e) =>
          setSelected(revisions.find((r) => r.id === e.target.value) ?? null)
        }
      >
        <option value="">Choose a revision</option>
        {revisions.map((r) => (
          <option key={r.id} value={r.id}>
            Version {r.version} · {new Date(r.created_at).toLocaleString()}
          </option>
        ))}
      </select>
      {selected && (
        <>
          <div className="revision-compare">
            <div>
              <h4>Version {selected.version}</h4>
              <pre>{plain(selected.content)}</pre>
            </div>
            <div>
              <h4>Current saved version {currentVersion}</h4>
              <pre>{plain(current)}</pre>
            </div>
          </div>
          <label>
            <input type="checkbox" required form="restore-revision" /> I have
            saved my draft and want to restore this version.
          </label>
          <form
            id="restore-revision"
            onSubmit={(e) => {
              e.preventDefault();
              void act({
                action: "restore",
                revisionId: selected.id,
                source: selected.source ?? "revision",
                version: currentVersion,
              });
            }}
          >
            <button
              className="button"
              disabled={busy || selected.version === currentVersion}
            >
              Restore as new version
            </button>
          </form>
        </>
      )}
    </section>
  );
}
