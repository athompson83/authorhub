"use client";
import Link from "next/link";
import type { BookSource } from "@/features/references/schema";
import { uploadBookImage } from "@/features/assets/upload";
import { replaceAssetReferences } from "@/features/assets/references";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultEdition, editionSchema, type Edition } from "./schema";
import { publicationSchema, publicationHtml, readiness } from "./publication";
import { download } from "./download";
import { type ArtifactFormat } from "./artifact-format";
type SavedEdition = {
  id: string;
  name: string;
  version: number;
  config: unknown;
};
type Release = {
  id: string;
  name: string;
  created_at: string;
  payload: unknown;
};
type Book = { id: string; title: string; subtitle: string | null };
export function Studio({
  book,
  sources,
  initialAssetUrls,
  nodes,
  editions,
  releases,
}: {
  book: Book;
  sources: BookSource[];
  initialAssetUrls: Record<string, string>;
  nodes: unknown[];
  editions: SavedEdition[];
  releases: Release[];
}) {
  const router = useRouter();
  const [assetUrls, setAssetUrls] = useState(initialAssetUrls);
  const [config, setConfig] = useState<Edition>(() =>
    editions[0] ? editionSchema.parse(editions[0].config) : defaultEdition,
  );
  const [editionId, setEditionId] = useState(editions[0]?.id),
    [version, setVersion] = useState(editions[0]?.version),
    [tab, setTab] = useState("Metadata"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [releaseName, setReleaseName] = useState("Publication candidate"),
    [selectedRelease, setSelectedRelease] = useState("");
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigation = (event: MouseEvent) => {
      if ((event.target as Element).closest("a[href]")) {
        event.preventDefault();
        setMessage("Save your edition settings before leaving the studio.");
      }
    };
    const action = (event: Event) => {
      event.preventDefault();
      setMessage("Save your edition settings before signing out.");
    };
    window.addEventListener("authorhub:before-action", action);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("authorhub:before-action", action);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty]);
  function update<K extends keyof Edition>(key: K, value: Edition[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }
  const parsed = publicationSchema.safeParse({
    schemaVersion: 1,
    rendererVersion: "authorhub-1",
    book,
    sources,
    edition: config,
    nodes,
  });
  const current = parsed.success ? parsed.data : null;
  const release = releases.find((r) => r.id === selectedRelease);
  const preview = release ? publicationSchema.parse(release.payload) : current;
  const checks = current
    ? readiness(current)
    : {
        blockers: parsed.error?.issues.map((i) => i.message) ?? [],
        warnings: [],
      };
  async function post(body: object) {
    const response = await fetch(`/api/books/${book.id}/publishing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function save() {
    setBusy(true);
    setMessage("Saving edition…");
    try {
      const result = await post({
        action: "save",
        id: editionId,
        version,
        config,
      });
      setEditionId(result.id);
      setVersion(result.version);
      setDirty(false);
      setMessage("Edition saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function freeze() {
    setBusy(true);
    try {
      const result = await post({
        action: "freeze",
        id: editionId,
        name: releaseName,
      });
      setSelectedRelease(result.id);
      setMessage("Publication copy frozen.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Release failed.");
    } finally {
      setBusy(false);
    }
  }
  const text = (key: keyof Edition, label: string, multiline = false) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          value={String(config[key])}
          onChange={(e) => update(key, e.target.value as never)}
          rows={4}
        />
      ) : (
        <input
          value={String(config[key])}
          onChange={(e) => update(key, e.target.value as never)}
        />
      )}
    </label>
  );
  const number = (
    key: keyof Edition,
    label: string,
    min: number,
    max: number,
    step = 0.05,
  ) => (
    <label key={key}>
      {label}
      <input
        type="number"
        value={Number(config[key])}
        min={min}
        max={max}
        step={step}
        onChange={(e) => update(key, e.target.valueAsNumber as never)}
      />
    </label>
  );
  const color = (
    key: "accent" | "coverColor" | "coverTextColor",
    label: string,
  ) => (
    <label>
      {label}
      <input
        type="color"
        value={config[key]}
        onChange={(e) => update(key, e.target.value)}
      />
    </label>
  );
  const image = (key: "coverImage" | "backImage", label: string) => (
    <label>
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setMessage("Uploading artwork…");
          try {
            const asset = await uploadBookImage(book.id, file);
            setAssetUrls((urls) => ({ ...urls, [asset.id]: asset.url }));
            update(key, asset.reference);
            setMessage(
              "Artwork uploaded. Save your edition to keep this selection.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Artwork upload failed.",
            );
          }
        }}
      />
      {config[key] && (
        <button
          type="button"
          className="button"
          onClick={() => update(key, "")}
        >
          Remove image
        </button>
      )}
    </label>
  );
  async function exportFile(format: ArtifactFormat) {
    if (!release) return;
    setBusy(true);
    setMessage("Preparing your export…");
    try {
      const start = await fetch(`/api/releases/${release.id}/exports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const queued = await start.json();
      if (!start.ok) throw new Error(queued.error);
      for (let attempt = 0; attempt < 150; attempt++) {
        const status = await fetch(
            `/api/releases/${release.id}/exports?job=${queued.jobId}`,
          ),
          result = await status.json();
        if (!status.ok) throw new Error(result.error);
        if (result.status === "succeeded") {
          const response = await fetch(result.url);
          if (!response.ok)
            throw new Error(
              "Download unavailable. Retry to retrieve your saved export.",
            );
          download(await response.blob(), result.filename);
          setMessage(
            "Export downloaded. A protected copy is saved with this release.",
          );
          return;
        }
        if (result.status === "failed") throw new Error(result.error);
        setMessage(
          "Generating export. Your frozen release is safe; this may take a minute for a long textbook.",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw new Error(
        "Export is still processing. Retry after five minutes to resume an interrupted export.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Export failed. Retry to resume safely.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="publication-studio">
      <Link className="muted" href={`/books/${book.id}`}>
        ← Manuscript
      </Link>
      <div className="page-heading">
        <div>
          <h2>Publication studio</h2>
          <p className="muted">
            {book.title} ·{" "}
            {dirty ? "Unsaved edition changes" : "Edition settings saved"}
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy || !current}
          onClick={() => void save()}
        >
          Save edition
        </button>
      </div>
      <div className="studio-layout">
        <section className="studio-controls">
          <label>
            Edition
            <select
              value={editionId ?? ""}
              onChange={(e) => {
                if (
                  dirty &&
                  !window.confirm("Discard unsaved edition changes?")
                )
                  return;
                const edition = editions.find((x) => x.id === e.target.value);
                setEditionId(edition?.id);
                setVersion(edition?.version);
                setConfig(
                  edition
                    ? editionSchema.parse(edition.config)
                    : defaultEdition,
                );
                setDirty(!edition);
              }}
            >
              <option value="">New edition</option>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
              {editionId && !editions.some((e) => e.id === editionId) && (
                <option value={editionId}>{config.name}</option>
              )}
            </select>
          </label>
          <nav className="studio-tabs" aria-label="Publication settings">
            {["Metadata", "Interior", "Cover", "Release"].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          <div role="status" className="studio-message">
            {message}
          </div>
          {tab === "Metadata" && (
            <div className="studio-fields">
              {text("name", "Edition name")}
              {text("author", "Author / contributors")}
              {text("publisher", "Publisher / imprint")}
              {text("language", "Language (e.g. en)")}
              {text("isbn", "ISBN-13 (optional)")}
              {text("description", "Book description", true)}
              {text("copyright", "Copyright / rights", true)}
            </div>
          )}
          {tab === "Interior" && (
            <div className="studio-fields">
              <p className="muted">
                Dimensions are in inches; type sizes and spacing are in points.
              </p>
              {number("trimWidth", "Trim width", 4, 12)}
              {number("trimHeight", "Trim height", 6, 16)}
              {number("margin", "Outer / top / bottom margin", 0.25, 2)}
              {number("gutter", "Additional inside gutter", 0, 1)}
              <label>
                Body font
                <select
                  value={config.font}
                  onChange={(e) =>
                    update("font", e.target.value as Edition["font"])
                  }
                >
                  {["Georgia", "Times New Roman", "Arial"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              {number("fontSize", "Body font size", 8, 24, 1)}
              {number("lineHeight", "Line height", 1, 2)}
              {number("paragraphSpacing", "Paragraph spacing", 0, 24, 1)}
              {number("indent", "First-line indent", 0, 1)}
              {color("accent", "Heading color")}
              {text("runningHeader", "Running header")}
              {(["toc", "pageNumbers"] as const).map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(e) => update(key, e.target.checked)}
                  />
                  {key === "toc"
                    ? "Include table of contents"
                    : "Print page numbers"}
                </label>
              ))}
            </div>
          )}
          {tab === "Cover" && (
            <div className="studio-fields">
              {color("coverColor", "Cover background")}
              {color("coverTextColor", "Cover text color")}
              {number("coverTitleSize", "Title size", 16, 80, 1)}
              {number("coverInset", "Cover text inset", 0.25, 2)}
              {number("coverTitleOffset", "Title top offset", 0, 5)}
              {number("backFontSize", "Back copy type size", 8, 32, 1)}
              {number("spineFontSize", "Spine type size", 8, 32, 1)}
              <label>
                <input
                  type="checkbox"
                  checked={config.barcode}
                  onChange={(event) => update("barcode", event.target.checked)}
                />{" "}
                Include assigned ISBN barcode
              </label>
              {number("barcodeWidth", "Barcode width", 1.4, 2.5)}
              <label>
                Text alignment
                <select
                  value={config.coverAlign}
                  onChange={(e) =>
                    update(
                      "coverAlign",
                      e.target.value as Edition["coverAlign"],
                    )
                  }
                >
                  {["left", "center", "right"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              {image("coverImage", "Front cover artwork")}
              {image("backImage", "Back cover artwork")}
              {number("coverImageOpacity", "Artwork opacity", 0, 1)}
              {text("backText", "Back cover copy", true)}
              {text("spineText", "Spine text")}
              {number("spineWidth", "Final spine width (from printer)", 0, 3)}
              {number("bleed", "Cover bleed", 0, 0.25, 0.025)}
              <p className="muted">
                Use your printer’s final page count, paper and binding template
                for spine width. The optional barcode uses your assigned ISBN.
                Review its placement, image resolution and the complete wrap
                against your printer’s template before submission.
              </p>
            </div>
          )}
          {tab === "Release" && (
            <div className="studio-fields">
              <h3>Publication readiness</h3>
              {checks.blockers.map((s, i) => (
                <p key={i} className="error">
                  {s}
                </p>
              ))}
              {!checks.blockers.length && (
                <p>Basic manuscript and metadata checks passed.</p>
              )}
              {checks.warnings.map((s, i) => (
                <p key={i} className="muted">
                  {s}
                </p>
              ))}
              <label>
                Release name
                <input
                  value={releaseName}
                  maxLength={200}
                  onChange={(e) => setReleaseName(e.target.value)}
                />
              </label>
              <button
                className="button primary"
                disabled={
                  busy ||
                  dirty ||
                  !editionId ||
                  !!checks.blockers.length ||
                  !releaseName.trim()
                }
                onClick={() => void freeze()}
              >
                Freeze publication copy
              </button>
              <p className="muted">
                Save edition settings first. Frozen copies preserve the
                manuscript and design together. Later edits create a new
                release.
              </p>
              <label>
                Frozen release
                <select
                  value={selectedRelease}
                  onChange={(e) => setSelectedRelease(e.target.value)}
                >
                  <option value="">Choose a release to export</option>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {new Date(r.created_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  "epub",
                  "docx",
                  "interior_pdf",
                  "cover_pdf",
                  "interior_html",
                  "cover_html",
                  "backup",
                ] as const
              ).map((f) => (
                <button
                  key={f}
                  className="button"
                  disabled={!release || busy}
                  onClick={() => void exportFile(f)}
                >
                  {
                    {
                      epub: "Download EPUB",
                      docx: "Download DOCX",
                      interior_pdf: "Download interior PDF",
                      cover_pdf: "Download cover PDF",
                      interior_html: "Download print interior HTML",
                      cover_html: "Download cover wrap HTML",
                      backup: "Download release backup",
                    }[f]
                  }
                </button>
              ))}
              <p className="muted">
                Exports are generated from this frozen release and stored
                privately. PDF files include the saved trim, margins and cover
                geometry. Check your printer’s template before submission.
                Downloading does not submit files to a retailer.
              </p>
            </div>
          )}
        </section>
        <section className="studio-preview">
          <div className="preview-caption">
            {release
              ? `Frozen release: ${release.name}`
              : "Live preview · save settings to preserve changes"}
          </div>
          {preview ? (
            <iframe
              title={
                tab === "Cover" ? "Cover wrap preview" : "Interior preview"
              }
              sandbox="allow-same-origin"
              onLoad={(event) => {
                const frame = event.currentTarget;
                const doc = frame.contentDocument;
                if (!doc) return;
                const help = doc.querySelector<HTMLElement>(".print-help");
                if (help) help.style.display = "none";
                if (tab === "Cover") {
                  const wrap = doc.querySelector<HTMLElement>(".cover-wrap");
                  if (wrap) {
                    wrap.style.zoom = String(
                      Math.min(
                        1,
                        (frame.clientWidth - 48) /
                          ((2 * preview.edition.trimWidth +
                            preview.edition.spineWidth +
                            2 * preview.edition.bleed) *
                            96),
                      ),
                    );
                    wrap.style.margin = "0";
                  }
                }
              }}
              srcDoc={publicationHtml(
                replaceAssetReferences(preview, (id) => assetUrls[id] ?? ""),
                tab === "Cover" ? "cover" : "interior",
              )}
            />
          ) : (
            <p>Correct the settings to preview your edition.</p>
          )}
        </section>
      </div>
    </div>
  );
}
