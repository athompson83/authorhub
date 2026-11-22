"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultEdition, editionSchema, type Edition } from "./schema";
import { publicationSchema, publicationHtml, readiness } from "./publication";
import { download, epub, docx } from "./exports";
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
  nodes,
  editions,
  releases,
}: {
  book: Book;
  nodes: unknown[];
  editions: SavedEdition[];
  releases: Release[];
}) {
  const router = useRouter();
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
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigation, true);
    return () => {
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
          if (
            file.size > 2_000_000 ||
            !["image/png", "image/jpeg"].includes(file.type)
          ) {
            setMessage("Choose a PNG or JPEG under 2 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => update(key, String(reader.result));
          reader.onerror = () => setMessage("Image could not be read.");
          reader.readAsDataURL(file);
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
  async function exportFile(
    format: "epub" | "docx" | "json" | "interior" | "cover",
  ) {
    if (!release) return;
    setBusy(true);
    try {
      const p = publicationSchema.parse(release.payload),
        name = `authorhub-${release.id}`;
      if (format === "epub")
        download(
          new Blob([new Uint8Array(epub(p, release.id))], {
            type: "application/epub+zip",
          }),
          `${name}.epub`,
        );
      else if (format === "docx") download(await docx(p), `${name}.docx`);
      else if (format === "json")
        download(
          new Blob([JSON.stringify(release.payload, null, 2)], {
            type: "application/json",
          }),
          `${name}.json`,
        );
      else
        download(
          new Blob([publicationHtml(p, format)], { type: "text/html" }),
          `${name}-${format}.html`,
        );
      setMessage("Export downloaded.");
    } catch {
      setMessage("Export failed. Your release has been preserved.");
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
                for spine width. Cover export has no barcode; add the
                printer-approved barcode before submission. Review image
                resolution at final size.
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
              {(["epub", "docx", "interior", "cover", "json"] as const).map(
                (f) => (
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
                        interior: "Download print interior (HTML → PDF)",
                        cover: "Download cover wrap (HTML → PDF)",
                        json: "Download release backup",
                      }[f]
                    }
                  </button>
                ),
              )}
              <p className="muted">
                HTML exports print to PDF in your browser. Files need
                publisher/printer validation. Downloading a release does not
                submit it to a retailer.
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
                preview,
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
