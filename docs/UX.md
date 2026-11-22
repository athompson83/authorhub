# AuthorHub UX and Information Architecture

## Experience goals

AuthorHub should feel like professional publishing software with modern AI assistance, not a generic chatbot wrapped around a text editor.

Primary UX principles:
- manuscript first
- progress always visible
- AI is contextual, never dominant
- complex publishing concepts are translated into author language
- evidence is inspectable
- history feels safe and reversible
- publishing readiness is explicit

## Global navigation

```text
Library
Search
Recent
Templates
Settings
Admin (authorized users only)
```

## Library

Book cards show:
- cover placeholder/art
- title/subtitle
- status
- completion percentage
- total word count
- chapters approved / total
- unresolved claims
- last edited time
- current publication-readiness percentage when applicable

Primary actions:
- New book
- Import manuscript
- Open project
- Duplicate project
- Archive project

## New book flow

Step 1 — Basics
- title or working title
- subtitle optional
- author profile
- series optional

Step 2 — Purpose
- target reader
- desired outcome
- genre/category
- tone/voice
- target word count optional

Step 3 — Starting point
- blank book
- generate outline
- import manuscript
- import outline
- start from template

Step 4 — Sources
- add now
- skip for later

The user should reach an editable project quickly; do not force every publishing field up front.

## Core book workspace

Desktop layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb / Book title       Search       Sync      Share      Publish    │
├────────────────┬─────────────────────────────────────┬─────────────────────┤
│ Manuscript     │                                     │ Context Panel       │
│                │                                     │                     │
│ Front Matter   │             Editor                  │ AI                  │
│ Part I         │                                     │ Sources             │
│  Chapter 1     │                                     │ Claims              │
│  Chapter 2     │                                     │ Comments            │
│ Part II        │                                     │ History             │
│                │                                     │                     │
├────────────────┴─────────────────────────────────────┴─────────────────────┤
│ words • chapter status • save state • sync/job state                      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Left manuscript rail
- collapsible hierarchy
- drag/reorder
- add node
- chapter status indicator
- word count
- unresolved issue badges
- search/filter

### Editor
- chapter/section-scoped editor
- distraction-free mode
- writing toolbar that stays restrained
- slash command or insert menu for structure/media
- inline comment/suggestion markers
- citation markers
- optional evidence overlay

### Right context panel
Tabs:
- AI
- Sources
- Claims
- Comments
- History

The panel is contextual to the current selection/node where possible.

## AI interaction

Selection menu actions:
- Improve clarity
- Shorten
- Expand
- Preserve my voice
- Rewrite for audience
- Fact-check
- Find evidence
- Suggest citation
- Explain

AI output should default to a diff/suggestion experience:

```text
Original | Suggested
Accept
Accept with edits
Reject
Try again
```

For informational AI analysis, show structured findings without forcing manuscript changes.

## Sources workspace

Views:
- All sources
- By chapter
- Needs metadata
- Processing failed

Source detail:
- metadata
- original file/page viewer when supported
- extracted text
- searchable occurrences
- linked claims
- linked citations
- linked manuscript passages

Users should be able to highlight a source excerpt and choose:
- Add as evidence
- Cite this
- Save note

## Evidence view

Toggleable layer over the manuscript.

Status presentation:
- Supported
- Partially supported
- Disputed
- Unsupported
- Stale
- Author experience
- Legal review

Use icons/text in addition to color.

Selecting a claim opens:
- claim text
- status
- supporting evidence
- contradictory evidence
- source location
- verification date
- reviewer
- actions

## History

Author-facing terminology:
- Timeline
- Snapshot
- Compare
- Restore

Do not expose git concepts.

Key actions:
- Create snapshot
- Compare with current
- Restore this chapter
- Restore whole snapshot
- View AI changes

Restore requires confirmation and must itself be reversible.

## Publication Studio

Navigation sections:

```text
Overview
Manuscript
Editorial
Evidence & Citations
Book Design
Cover
Metadata
ISBN
Exports
```

Overview uses readiness groups and blockers.

Example:

```text
Manuscript           100%  Ready
Evidence & citations  86%  3 blockers
EPUB                   92%  2 accessibility warnings
Print                  71%  Cover and ISBN incomplete
```

Blockers and warnings must be distinct.

## Edition experience

Book settings contain Editions.

Each edition card shows:
- format
- edition number
- language
- ISBN
- release status
- last generated artifact

Creating an edition asks only format-relevant questions.

## Export experience

Export is asynchronous.

States:
- Preparing
- Rendering
- Validating
- Ready
- Failed

When ready, show:
- format
- file size
- generated time
- validation state
- warnings
- download

A failed export must explain the actionable reason without exposing server internals.

## Mobile/tablet

The full authoring experience is desktop-first, but responsive behavior must support:
- library browsing
- reading manuscript
- comments/review
- claims/evidence review
- minor text edits
- publication readiness review

On small screens, manuscript rail and context panel become drawers/sheets rather than permanent columns.

## Accessibility

Required:
- keyboard navigation
- visible focus
- semantic buttons/inputs
- screen-reader labels
- status not conveyed by color alone
- reduced-motion respect
- adequate contrast
- resizable text
- editor keyboard shortcuts documented

## Empty/error states

Every major workspace needs a designed state for:
- no books
- no sources
- no claims
- no comments
- source processing failure
- AI provider failure
- export failure
- permission denied
- offline/reconnect behavior where relevant

## UX acceptance criteria

A first-time user should be able to create a book and reach the editor without understanding publishing technology. An experienced author should be able to locate manuscript structure, research, history, and publication readiness without using AI chat as navigation.
