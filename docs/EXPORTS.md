# AuthorHub Export and Publishing Pipeline

## Goal

Generate professional DOCX, EPUB, and PDF artifacts from one canonical manuscript without creating format-specific editable copies.

## Canonical flow

```text
Canonical manuscript
  + edition configuration
  + publication metadata
        ↓
Normalized publication document
        ↓
Format adapter
  ├── DOCX
  ├── EPUB 3
  └── print HTML/CSS → PDF
        ↓
Format-specific validation
        ↓
Immutable release artifact
```

## Normalized publication document

Before format rendering, assemble an immutable normalized representation containing:
- ordered manuscript nodes
- semantic block structure
- resolved citations
- bibliography
- images/assets with metadata
- footnotes/endnotes
- front/back matter
- heading hierarchy
- cross-references
- edition-specific inclusion rules
- publication metadata

This representation is generated from a snapshot/release candidate and cannot mutate the working manuscript.

## DOCX

Purpose:
- editor/publisher handoff
- archival portability
- downstream manual editing where required

Must preserve where possible:
- headings
- paragraph styles
- lists
- tables
- footnotes/endnotes
- images
- page breaks
- citations/bibliography

Validation:
- file opens successfully in a standards-compatible reader
- expected structural elements exist
- no missing required assets

## EPUB 3

Requirements:
- valid EPUB 3 package
- semantic navigation document
- correct spine/order
- accessible image alt text checks
- semantic headings
- metadata
- internal link validation
- embedded fonts only when licensing permits

Validation should include an automated EPUB validator in CI/worker tests.

## Print PDF

Print rendering is edition-specific.

Configuration includes:
- trim size
- margins
- gutter
- bleed
- page-number rules
- running headers/footers
- chapter-open behavior
- paragraph indentation/spacing
- widows/orphans
- hyphenation
- image sizing/resolution
- paper/color assumptions

Preferred architecture:

```text
normalized publication document
  -> semantic HTML
  -> print stylesheet/theme
  -> PDF renderer
  -> preflight checks
```

Do not hand-construct PDF page coordinates for normal prose layout unless a specific feature requires it.

## Themes

Interior themes are declarative configuration, not manuscript content.

A theme may define:
- typography
- heading styles
- chapter openings
- spacing
- ornaments
- headers/footers
- quote styles
- table styles

Theme changes must not alter manuscript semantics.

## Images

Track:
- source asset
- dimensions
- DPI where relevant
- alt text
- caption
- rights/permission metadata
- placement intent

Print preflight should flag low-resolution images relative to rendered size.

## Cover workflow

MVP may store/import final cover assets and guide readiness. Later cover generation should follow:

concept → selected direction → editable layout → final page count/trim/binding → spine calculation → barcode placement → print preflight.

AI-generated concept art must not be treated as a production-ready wraparound cover automatically.

## Release model

Exports are generated from a `publication_release` tied to an immutable snapshot.

A release contains:
- exact snapshot
- edition config hash
- metadata hash
- renderer version
- artifact hashes
- validation report

Changing manuscript content or material edition settings requires a new release.

## Idempotency

A retry for the same release/render request must not create multiple logically distinct releases or charge usage twice. Rendering jobs should key on release + format + renderer version unless an explicit regeneration is requested.

## Publication-readiness checks

Examples of blockers:
- unresolved required metadata
- invalid heading hierarchy for EPUB
- missing required cover for print release
- missing ISBN when the chosen distribution plan requires one
- unresolved broken internal links
- invalid EPUB
- print PDF generation failure

Examples of warnings:
- low-resolution noncritical image
- long chapter without subheadings
- missing optional short description
- accessibility alt-text suggestions

## Artifact storage

Generated artifacts are private by default and served using signed, time-limited URLs.

Store:
- file hash
- size
- renderer version
- validation status
- generation timestamp

## Future distribution

Retailer/distributor integrations consume validated release artifacts and metadata. They do not read from a mutable editor document directly.
