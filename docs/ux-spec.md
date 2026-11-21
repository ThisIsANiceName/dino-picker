# Dino Selector: UX spec (v1, "next level")

Source of truth for builders. Tokens and primitives already exist: `tailwind.config.js`, `src/style.css`, `src/components/ui/*` (barrel: `src/components/ui/index.js`), live at `/#/design-system`. Research and print numbers: `docs/research.md`.

## 1. Design direction: "Specimen Sticker"

We move on from the dark brown/amber look. The app is now **lichen paper** (`bg` #E4E7D8, green-grey, not cream) with **deep jungle teal** (#0F3934) for the nav, studio stages and reveal moments, and **resin amber** (#F5AE36) as the single action colour, plus **magma** (#D2335F) for delight and focus. Think of a 1960s natural-history museum poster printed as a die-cut sticker sheet. Depth is a hard offset shadow in jungle ink (`shadow-sticker`), never a grey blur. Avatars and anything you "own" get a white die-cut keyline (`shadow-diecut`, `.sticker`) and may tilt 1-3 degrees. Headings use **Caprasimo** (fat, warm 70s serif); UI uses **Schibsted Grotesk**. Boldness lives in the avatars, the headings and the reveal moments; everything else stays quiet: sentence case, no all-caps labels, no gradients, one primary button per view. Playful through character art and copy, not through cartoon UI.

Rules of thumb:
- Radius follows hierarchy: buttons/chips/inputs are pills or `rounded-md`; content cards `rounded-lg` (18px); stickers/avatars `rounded-xl` (26px).
- Paper cards (`UiCard variant="paper"`) hold primary content; `flat` for groupings inside them; `sunken` for wells; `jungle` (or any `.theme-jungle` wrapper) for dark stages. The dark scope flips every semantic token, so primitives work unchanged inside it.
- Use semantic colour classes (`bg-surface`, `text-ink-muted`, `border-line-strong`, `bg-primary`). Raw scales only for illustration and data colour. Diet and period colours: `diet-*`, `period-*`, or `UiBadge variant="diet|period"`.
- Legacy classes (`earth-*`, `fossil-*`, `diet-badge-*`, `period-badge`, `card-hover`) exist only so old views keep rendering. Delete usages as you rewrite.

## 2. Fonts (exact family names, self-hosted via @fontsource, imported in `src/main.js`)

| Family (use verbatim on canvas) | Weights loaded | Role | Tailwind |
|---|---|---|---|
| `Caprasimo` | 400 | Display: headings, names, big numbers | `font-display` |
| `Schibsted Grotesk` | 400, 500, 600, 700, 800, 400 italic | UI and body | `font-sans` / `font-body` |
| `Graduate` | 400 | Shirt: varsity/college slab | `font-varsity` |
| `Fredoka` | 500, 700 | Shirt: rounded, friendly | `font-rounded` |
| `Big Shoulders Display` | 700, 900 | Shirt: condensed poster | `font-condensed` |

Canvas use: `ctx.font = '400 360px "Caprasimo"'`, and `await document.fonts.load('400 360px "Caprasimo"')` before drawing. Caprasimo has one weight: never set bold (synthesis is disabled globally). `Graduate` has no latin-ext glyphs: if a name contains characters outside Latin-1 (for example "Łukasz"), show an inline hint in the Shirt Studio ("Graduate can't draw ł. Pick another font for this line.") and fall back per line.

## 3. Information architecture

### Route table (hash mode)

| Path | View component | Purpose |
|---|---|---|
| `/` | `TeamView` | Roster wall of profile cards, add teammate, empty state |
| `/people/new` | `PersonNewView` | Name, then choose: take quiz or pick a dino |
| `/people/:id` | `PersonView` | Profile: avatar, dino facts, personality, traits, note, compatibility |
| `/people/:id/edit` | `PersonEditView` | Name, note, change dino, remove person |
| `/people/:id/avatar` | `AvatarStudioView` | Avatar Studio |
| `/people/:id/shirts` | `ShirtListView` | That person's saved designs + "New design" |
| `/people/:id/shirts/:designId` | `ShirtStudioView` | Shirt Studio (`designId = new` creates one) |
| `/team-shirt/:designId` | `ShirtStudioView` (`mode="team"`) | Team edition: one design, every person |
| `/quiz` | `QuizView` | Intro, questions, reveal. `?for=<personId>` preselects the person |
| `/dinopedia` | `DinopediaView` | Browse, search, filter the catalog |
| `/dinopedia/:dinoId` | `DinoDetailView` | Facts, illustration, "who has this dino" |
| `/insights` | `InsightsView` | Composition stats, pairings, links to print views |
| `/insights/poster` | `PosterView` | A3 landscape team wall, print stylesheet |
| `/insights/name-cards` | `NameCardsView` | A4 sheet of folded name cards |
| `/design-system` | `DesignSystemView` | Kitchen sink (exists) |
| `/:pathMatch(.*)*` | `NotFoundView` | Lost-dino 404 using the `error-meteor` spot |

Redirects for old links: `/add` to `/people/new`, `/person/:id` to `/people/:id`, `/person/:id/edit` to `/people/:id/edit`.

### Global navigation
- **Desktop (md and up)**: sticky jungle top bar, 64px. Left: logo mark + "Dino Selector" (Caprasimo). Centre-left: Team, Quiz, Dinopedia, Insights as pills (active = `bg-ink text-ink-inverse`, `aria-current="page"`). Right: primary `UiButton` "Add teammate". The design-system page shows the exact markup.
- **Mobile (below md)**: compact top bar (logo + page title) and a fixed bottom tab bar (64px + safe area): Team, Quiz, centre raised amber "Add" (label visually hidden: "Add teammate"), Dinopedia, Insights. Toasts sit above the tab bar (handled by `UiToast`).
- **Studios and print views hide global nav.** Studios get their own bar: back arrow ("Back to Mira"), title, undo/redo, Export, Save. Print views get a slim toolbar with "Print" and "Back", marked `data-print-hide`.
- Mount `<UiToast />` once in `App.vue`. Call `restoreMotionPreference()` on mount; put a "Reduce motion" toggle in the footer (desktop) and Insights page (mobile).

## 4. Screens

Each screen loads with skeletons (`UiSkeleton`) inside an `aria-busy="true"` region, never a spinner page. Errors use `UiEmptyState tone="error"` with the `error-meteor` spot and a "Try again" button. Mutations are optimistic with an undo toast where destructive.

### 4.1 Team (home) `/`

```
┌ top bar ─────────────────────────────────────────────────────────┐
│ Our herd                                [search name] [Add teammate]
│ 9 teammates, 5 herbivores                                         │
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   ← paper cards, tilt │
│ │avatar │  │avatar │  │avatar │  │avatar │     alternates -2..2°  │
│ │ 1:1   │  │       │  │       │  │       │                       │
│ ├───────┤  ├───────┤  ├───────┤  ├───────┤                       │
│ │Mira   │  │Jonas  │  │Priya  │  │ + Add │  ← last card: dashed   │
│ │Stego. │  │Raptor │  │Trike  │  │       │    sunken "Add" slot   │
│ │(Quiet │  │(Swift │  │(Steady│  └───────┘                       │
│ │Fortress)│ Fixer) │  Shield)│                                   │
│ └───────┘  └───────┘  └───────┘                                   │
└───────────────────────────────────────────────────────────────────┘
```
- Grid: 2 cols (phone), 3 (sm), 4 (lg), 5 (xl). Card = `UiCard to=… padding="none"` with avatar (rendered from config), name (Caprasimo xl), dino name, archetype pill. No dino yet: avatar slot shows the egg + "Needs a dino" badge and the card links to the quiz with `?for=id`.
- Sort: A to Z. Search filters client-side by name or dino (shown only with 7+ people).
- Empty: `UiEmptyState` with `empty-roster` spot, "No teammates yet", action "Add teammate". Secondary link "Browse the Dinopedia".
- Delight: (1) a newly added card enters with `animate-sticker-slap` (420ms). (2) Hovering a card lifts it and the avatar bobs once (`bob`, 1 cycle, 3.2s easing, hover only). Both off under reduced motion.

### 4.2 Person profile `/people/:id`

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Team                                                            │
│ ┌──────────────┐   Mira Okafor                     [Edit] [⋯]     │
│ │  big avatar  │   Stegosaurus · "The Quiet Fortress"             │
│ │  sticker,    │   Plated, patient, quietly armoured. (tagline)   │
│ │  tilt -2°    │   [Edit avatar] [Design a shirt] [Retake quiz]   │
│ └──────────────┘   Change dino                                    │
├─────────────── tabs: About · Traits · Compatibility ──────────────┤
│ About:  ┌ Dino fact card (paper) ─────┐ ┌ Personality (paper) ──┐ │
│         │ illustration, pronunciation  │ │ Strengths ×3 (chips)  │ │
│         │ period/diet badges, length,  │ │ Quirk                 │ │
│         │ weight, era bar, fun fact    │ │ Team role             │ │
│         └──────────────────────────────┘ └───────────────────────┘ │
│         ┌ How to work with me (flat, editable inline, 280 chars) ┐ │
│ Traits: UiStatBar per trait (energy, social, size, defence …,     │
│         bipolar for chronotype/temperament), quiz answers summary │
│ Compat: list of teammates: avatar · label · one-line reason       │
└──────────────────────────────────────────────────────────────────┘
```
- Mobile: avatar centred on top, actions become a 2x2 grid, tabs stick under the top bar.
- Compatibility: labels, never scores or rankings. Use exactly these: "Kindred spirits", "Great balance", "Spicy combo", "Different eras" (computed from trait distance + complementarity). One reason line, e.g. "You both start work before the coffee does."
- No dino: hero shows egg avatar, "No dino yet", primary "Take the quiz", secondary "Pick one myself" (opens the Dinopedia picker in a `UiModal size="xl"`, bottom sheet on phones).
- Delight: (1) trait bars grow in on first view (`bar-grow`, 700ms, 60ms stagger). (2) The avatar sticker "peels" on hover (rotates to 0deg and lifts, 220ms spring). (3) Saving the note stamps a small "Saved" badge (`stamp`, 480ms).

### 4.3 Avatar Studio `/people/:id/avatar`

```
Desktop (≥1024)
┌ ← Back to Mira   Avatar Studio      [↶][↷]  [Export]  [Save to profile] ┐
├──────────────────────────────────────┬─────────────────────────────────┤
│  .theme-jungle stage, specimen dots  │ [Colours][Gear][Scene][Frame][Photo]  (UiTabs pill)
│                                      │ ─────────────────────────────── │
│        ┌──────────────────┐          │ Palette presets  ◐ ◐ ◐ ◐ ◐       │
│        │   live avatar    │          │ Body    ● ● ● ● ● ⊕ [#56A44C]    │
│        │   (SVG, 1:1)     │          │ Belly   ● ● ● ● ⊕ [#FFEBC2]      │
│        └──────────────────┘          │ Accent  ● ● ● ● ⊕ [#D2335F]      │
│   [Square|Circle]  [Randomise] [Reset]│                                 │
│   small previews: 128 · 64 circle    │                                 │
└──────────────────────────────────────┴─────────────────────────────────┘
Phone
┌ ← Mira   Avatar     ↶ ↷  Save ┐
│  sticky stage (45dvh)         │
│      [avatar]                 │
│  [Randomise] [Square|Circle]  │
├═══ UiBottomSheet docked ══════┤  snap: peek / half (default) / full
│ (Colours)(Gear)(Scene)(Frame) │  tabs fitted, icon over label
│ swatches…                     │
└───────────────────────────────┘
```
Tabs and their contents:
- **Colours**: palette presets (catalog `palette` of the person's dino first, then 7 house presets) as `UiColorSwatch colors=[body,belly,accent]`; then `UiColorPicker` for Body, Belly, Accent. Shade is derived (body mixed 30% toward #0B2B28) unless the user unlocks "Custom shade" (hidden behind a "More" disclosure).
- **Gear**: four slot sections (Hat, Eyewear, Neck, Extra). Each is a radiogroup grid of 72px tiles (first tile "None"), thumbnails rendered with the current dino. Selected tile shows a `UiColorPicker size="sm"` per accessory token (`--acc-1..3`, labels from manifest or "Main", "Trim", "Detail").
- **Scene**: background tiles (12) + their colour tokens (`--bg-1..n`).
- **Frame**: frame tiles (8, first "None") + colour tokens (`--frame-1..n`). Frames with `clip` change the preview crop.
- **Photo** (optional): "Use a photo instead". Upload (JPG, PNG, WebP up to 8 MB), then crop square with drag + `UiSlider` zoom; the frame still applies. Toggle "Show dino" / "Show photo" for where the avatar is rendered.

Interaction model:
- One `config` object in a studio store; preview renders from it. Every committed change pushes the previous config onto `history` (max 50). Sliders and colour drags update live but commit only on `change` (pointer up, Enter, swatch click), so one drag = one undo step.
- **Randomise** picks a harmonious preset + 0-2 accessories + background + maybe frame; never changes the dino or photo. The stage avatar plays `wiggle` (400ms).
- **Reset** returns to the last saved config (confirm only if more than 3 steps would be lost).
- **Autosave**: draft to `localStorage['dino:draft:avatar:<personId>']` debounced 500ms. **Explicit save** writes to the server and shows toast "Avatar saved". Returning with a draft newer than the saved config shows a banner: "You have unsaved changes from 14:32. Restore / Discard". Leaving with unsaved changes opens `UiModal`: "Keep editing" / "Discard changes" / "Save and leave".
- Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` and `Ctrl+Y` redo, `R` randomise, `1-5` switch tabs, `Ctrl/Cmd+S` save, `Ctrl/Cmd+E` export, `?` shortcut sheet (modal). Single-key shortcuts are ignored while focus is in a text field.
- **Export dialog** (`UiModal`): format PNG / SVG (`UiSegmented`), size 128 / 256 / 512 / 1024 (default 512, hint "512 suits Slack and Discord, 1024 for everything else"), square/circle preview, transparent background toggle (PNG only). Primary "Download PNG" (label follows format). File name `mira-okafor-avatar-512.png`.
- Delight: (1) Save: the stage avatar does `sticker-slap` and a "Saved" stamp lands on the stage corner (480ms). (2) Picking an accessory: it drops onto the head with `pop-in` (360ms).

### 4.4 Shirt Studio `/people/:id/shirts/:designId`, `/team-shirt/:designId`

```
┌ ← Mira's shirts   "Offsite 2026" ✎     [↶][↷]  [Export]  [Save design] ┐
├────────────────────────────────────────┬───────────────────────────────┤
│ [Front|Back]   [eye] safe area   zoom  │ [Template][Text][Art][Colours][Garment]
│  ┌──────── garment mockup ─────────┐   │ Text tab:                     │
│  │      ┌ art box (dashed) ┐       │   │  Name     [Mira Okafor ] font▾│
│  │      │  avatar layer     │       │   │  Team     [Data Platform] ▾  │
│  │      │  MIRA (text)      │       │   │  Tagline  [Plated, patient]  │
│  │      │  ☆ decor          │       │   │  Year     [2026]             │
│  │      └───────────────────┘       │   │  per line: font, size slider,│
│  └──────────────────────────────────┘   │  colour (contrastWith=garment)│
│  ⚠ Dark green on forest green is hard to see. [Fix it]                 │
│  Layers: [avatar][MIRA][Data Platform][☆]  (selectable chips, ↑↓ order)│
└────────────────────────────────────────┴───────────────────────────────┘
```
- Same shell, store, history, autosave and shortcuts as the Avatar Studio. Additional keys: arrows nudge the selected layer by 1% of the art box (Shift = 5%), `Delete` removes it, `F`/`B` front/back, `[`/`]` move layer down/up.
- **Templates**: Classic badge, Retro sunset, Varsity, Name and number (back print), Minimal left chest, Team roster shirt. Applying a template on a non-empty design asks first ("Replace your design with Varsity?").
- **Text**: lines bound to tokens `{name}`, `{dino}`, `{team}`, `{tagline}`, `{year}`, `{number}`. Fonts: the five families in section 2. Size has a floor of 90px at master resolution (about 22pt); the slider stops there.
- **Art**: avatar layer (person's saved avatar or dino only), decor elements (20, from the kit), each with colour tokens.
- **Garment**: T-shirt, hoodie, tote; colours White #FFFFFF, Black #1E2420, Navy #1D2B4F, Heather grey #B9BCB5, Forest green #24452F, plus custom.
- **Low-contrast warning**: any layer colour under 3:1 against the garment shows an inline warning under the canvas and on the colour picker (`contrastWith`). "Fix it" swaps to the template's alternate ink. Warning, never a block.
- Selecting a layer on canvas: click/tap selects (2px magma outline + corner handles to scale/rotate on desktop; on phones use sliders in the sheet instead of handles).
- **Export dialog**: "Print file (PNG, 4500×5400, transparent)", "Vector (SVG, text as outlines)", "Mockup preview (PNG, 1600×1600)". Alpha is thresholded to 0/255. Print file name `mira-okafor-offsite-2026-front.png`.
- **Team edition**: toolbar shows a person switcher (`UiSelect` + prev/next) to preview tokens per person, plus a filmstrip of all teammates. "Export for everyone" shows `UiProgress` "Exporting team shirts, 5 of 8" and downloads one file per person.
- Delight: (1) Garment colour change: the mockup cross-fades and the shirt does a tiny 200ms "flap" (scaleY 1 to 0.98 to 1). (2) Export finished: toast "8 print files ready" with confetti (8 pieces, 1.2s) from the button.

### 4.5 Quiz `/quiz`

```
Question screen (phone first, max-w 640)
┌───────────────────────────────┐
│ ✕ Quit          Question 4/12 │
│ ▰▰▰▰▱▱▱▱▱▱▱▱ (UiProgress steps)│
│                               │
│  It's 7:30 am. You are…       │  ← Caprasimo display-sm
│  ┌──────────────────────────┐ │
│  │ A  Already on a run      │ │  ← answer cards, paper, 56px+
│  ├──────────────────────────┤ │
│  │ B  Answering Slack in bed│ │
│  ├──────────────────────────┤ │
│  │ C  Asleep. Obviously.    │ │
│  └──────────────────────────┘ │
│  ← Back                       │
└───────────────────────────────┘
Reveal (.theme-jungle full screen)
┌───────────────────────────────┐
│         (egg → hatch)         │
│   You're a Parasaurolophus    │
│   "The Hype Trumpet"          │
│  why you matched: 3 trait rows│
│  runners-up: [Ankylo.] [Maia.]│
│ [Apply to Mira ▾] [Save card] │
│ Retake · Browse all dinos     │
└───────────────────────────────┘
```
- Intro screen: `quiz-hero` spot, "12 questions, about 3 minutes. For fun, not science." Person picker (`UiSelect`, preselected from `?for`), "Start the quiz".
- 12 questions covering diet, energy, mobility, social, size, temperament, defence, chronotype (2 questions where a trait is fuzzy). Types: 4-option cards (most), this-or-that (2 big tiles, at question 4 and 9), and one 1-5 slider. Answer cards: tap selects and advances after 250ms; keys `1-4`/`A-D` choose, `Backspace` goes back. Progress persists in `sessionStorage` so a refresh resumes.
- Scoring: answers add trait deltas; match = cosine similarity against each catalog dino's trait vector; top match + 2 runners-up. "Why you matched" lists the 3 traits with smallest distance, each as a `UiStatBar` with your value and the dino's value as `compare` tick.
- Result actions: primary "Apply to {name}" (asks before overwriting an existing dino: "Swap Mira's Stegosaurus for a Parasaurolophus?"); "Save result card" downloads a 1080×1350 PNG (avatar or dino, archetype, tagline, 3 strengths, team name); "Retake quiz"; runner-up cards link to "Choose this one instead".
- Delight: (1) **Egg hatch**: egg wobbles 2× 600ms, cracks 450ms, dino pops (`hatch-pop`, 520ms) + 14 confetti pieces (1.2s): about 1.8s total. With reduced motion, the result appears instantly with a 220ms fade. (2) The answer card you pick presses in and a tiny footprint stamps on it (140ms). (3) Progress segment for the current question pops (`pop-in`).

### 4.6 Dinopedia `/dinopedia`, `/dinopedia/:dinoId`

```
┌───────────────────────────────────────────────────────────────┐
│ Dinopedia            [search: name, group, region………… ✕]      │
│ Period ( )Triassic ( )Jurassic (●)Cretaceous  Diet (●)Herb …   │
│ Body type ▾  Size ▾  Sort: A–Z ▾            118 dinos          │
│ [Cretaceous ✕] [Under 5 m ✕]  Clear all                        │
│ ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐                      │
│ │ art ││ art ││ art ││ art ││ art ││ art │  ← cards: art on     │
│ │name ││     ││     ││     ││     ││     │    palette bg, name, │
│ │badges│     ││     ││     ││     ││     │    period+diet badges│
│ └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘                      │
└───────────────────────────────────────────────────────────────┘
```
- Filters as `UiChip` toggles with counts; Body type and Size as `UiSelect`. On phones the filter row collapses into a "Filters (2)" button that opens a `UiBottomSheet`. Filters sync to the query string. Popular dinos float first under "Sort: Popular".
- Detail: big illustration on its palette, name + pronunciation + meaning, badges, an era bar (mya from/to on a Triassic-Cretaceous scale), stats grid (length, height, weight, speed, regions), description, fun fact in a sticker callout, personality block, and "Who in the team has this dino". Actions: "Make this my dino" (person picker).
- Empty search: `empty-search` spot, "No dinos match those filters", action "Clear filters".
- Delight: (1) Cards stagger in only on first load (40ms each, max 12). (2) On detail, the era bar's marker slides into place (700ms).

### 4.7 Team insights `/insights`, `/insights/poster`, `/insights/name-cards`

```
┌────────────────────────────────────────────────────────────────┐
│ Team insights                     [Print poster] [Name cards]   │
│ ┌ Diet mix ─────┐ ┌ Periods ──────┐ ┌ Body types ────────────┐   │
│ │ UiStatBar ×n  │ │ era timeline  │ │ sticker grid with count │   │
│ └───────────────┘ └───────────────┘ └────────────────────────┘   │
│ ┌ Pairings ───────────────────────────────────────────────────┐ │
│ │ matrix (desktop): avatars on both axes, cells = label icon  │ │
│ │ list (phone): "Mira + Jonas: Great balance"                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
Poster (A3 landscape, .print-poster): team name in Caprasimo 72pt,
grid of die-cut avatars with name + dino + archetype, footer stats line.
```
- Stats are facts, not rankings ("5 herbivores, 3 carnivores, 1 omnivore"). Fun headline from the data: "A mostly Cretaceous crew".
- Poster: wrap in `.print-poster`; `@page poster` is A3 landscape, 10mm margins. Cards `.print-card` (avoid page breaks). On screen show it scaled to fit with a toolbar.
- Name cards: A4 portrait (`.print-cards`), 2×4 cards of 95×65mm, each a folded tent card (top half upside down), avatar + name + dino + "Ask me about: {quirk}".
- Delight: (1) Opening the poster view slaps the stickers on one by one (60ms stagger, screen only). (2) Pairing cells reveal their reason in a `UiTooltip`.

## 5. Data the UI needs

Catalog data is static (`src/data/catalog/`); no API needed for it. Persisted entities:

**Person**: `id`, `name` (1-50 chars), `dinoId` (catalog id or null), `avatar` (AvatarConfig JSON or null: render a seeded default from `dinoId`), `photo` (`{ url, width, height }` or null; server re-encodes to WebP, strips EXIF, max 8 MB in), `note` ("how to work with me", max 280), `quiz` (`{ answers: [{ q, a }], traits: { energy: 3.4, … }, matches: [{ dinoId, score }], takenAt }` or null), `createdAt`, `updatedAt`.

**ShirtDesign**: `id`, `personId` (null for team edition), `name` (max 60), `config` (ShirtConfig JSON), `createdAt`, `updatedAt`.

**Team** (single row): `name` (default "Our herd"), `year`. Used by shirt tokens, the poster and the result card.

Per screen: Team needs persons list (id, name, dinoId, avatar, photo). Profile needs one person + all persons (compatibility uses their dinoIds and quiz traits). Avatar Studio reads/writes `avatar`, uploads `photo`. Shirt list/studio: designs by person, CRUD; team edition: designs with `personId = null` + all persons. Quiz writes `quiz` and optionally `dinoId`. Insights and print views: all persons + team.

## 6. Config shapes

**AvatarConfig** (all colours uppercase `#RRGGBB`; token keys exactly as in `kit-manifest.json` `defaults`; missing keys fall back to manifest defaults):
```json
{
  "v": 1,
  "dinoId": "stegosaurus",
  "bodyType": "stegosaur",
  "colors": { "body": "#56A44C", "belly": "#FFEBC2", "accent": "#D2335F", "shade": null },
  "accessories": {
    "hat": { "id": "party-hat", "colors": { "--acc-1": "#F472B6", "--acc-2": "#FDE047" } },
    "eyewear": null,
    "neck": { "id": "bowtie", "colors": { "--acc-1": "#1E2420" } },
    "extra": null
  },
  "background": { "id": "polka", "colors": { "--bg-1": "#FFEBC2", "--bg-2": "#F5AE36" } },
  "frame": { "id": "circle-ring", "colors": { "--frame-1": "#1E2420", "--frame-2": "#F5AE36" } },
  "photo": null,
  "display": "dino"
}
```
`shade: null` means derived. `photo` when set: `{ "url": "/uploads/9f3c.webp", "crop": { "x": 0.12, "y": 0.04, "size": 0.78 } }` (fractions of the source image); `display` is `"dino"` or `"photo"`. Unknown future fields must be preserved on save.

**ShirtConfig** (positions are fractions of the side's art box, so changing placement rescales cleanly; sizes in px at the 4500×5400 master):
```json
{
  "v": 1,
  "template": "classic-badge",
  "garment": { "type": "tshirt", "color": "#1E2420" },
  "sides": {
    "front": {
      "placement": "full-front",
      "layers": [
        { "id": "l1", "kind": "avatar", "source": "person", "x": 0.5, "y": 0.34, "w": 0.62, "rotate": 0 },
        { "id": "l2", "kind": "text", "text": "{name}", "font": "Caprasimo", "weight": 400,
          "size": 420, "color": "#FFFFFF", "tracking": 0, "arc": 0, "case": "none", "align": "center",
          "x": 0.5, "y": 0.74, "rotate": 0 },
        { "id": "l3", "kind": "decor", "decorId": "single-footprint", "colors": { "--decor-1": "#F5AE36" },
          "x": 0.82, "y": 0.12, "w": 0.12, "rotate": -12 }
      ]
    },
    "back": { "placement": "full-back", "layers": [] }
  }
}
```
Placements and art boxes at master scale: `full-front`/`full-back` 3600×4800 top-centred; `center-chest` 2400×2400; `left-chest` 1200×1200. `kind` is `avatar` | `dino` | `text` | `decor`; layer order = array order (first is bottom). `case`: `none` | `upper`. `arc`: -100..100 (text curve). `{number}` resolves to an optional per-person number stored on the design as `"numbers": { "<personId>": "07" }`.

## 7. Voice and copy

Warm, dry, specific. A friend who knows a lot about dinosaurs, not a mascot. Sentence case everywhere. Buttons say what happens; the toast repeats that verb. Jokes live in empty states, results and taglines, never in errors or destructive confirms. No exclamation marks in UI chrome, no "Oops", no emoji in UI text. "Teammate" (not user/member), "dino" in UI, "dinosaur" in headings when it reads better.

| Where | Copy |
|---|---|
| Team empty | "No teammates yet" / "Add the first person and give them a spirit dinosaur." |
| Add button | "Add teammate" |
| Person without dino | "No dino yet. Take the quiz or pick one yourself." |
| Quiz intro | "12 questions, about 3 minutes. For fun, not science." |
| Quiz reveal | "You're a Parasaurolophus." |
| Apply result | "Apply to Mira" → toast "Applied to Mira" |
| Overwrite confirm | "Swap Mira's Stegosaurus for a Parasaurolophus?" / "Swap dino" / "Keep Stegosaurus" |
| Avatar saved | "Avatar saved" |
| Unsaved draft | "You have unsaved changes from 14:32." / "Restore" / "Discard" |
| Low contrast | "Dark green on forest green is hard to see. It may vanish when printed." |
| Remove person | "Remove Jonas from the team?" / "His avatar, quiz result and 2 shirt designs go too." → toast "Removed Jonas" + "Undo" |
| Upload error | "That file is too big. Use a JPG, PNG or WebP under 8 MB." |
| Empty search | "No dinos match those filters" / "Clear filters" |
| 404 | "This page went extinct." / "Back to the team" |
| Network error | "Couldn't reach the server. Your changes are kept on this device." / "Try again" |

## 8. Accessibility requirements

- **Contrast**: body text 4.5:1 minimum (`ink-subtle` is the lightest allowed text on `bg`), UI edges and icons 3:1 (`line-strong`). Never put text on `primary` in any colour but `on-primary` (ink). Colour never carries meaning alone: diet/period badges always show the word; low-contrast warnings have an icon and text.
- **Focus**: visible `:focus-visible` ring (3px magma on paper, amber in jungle scope) on every interactive element; never remove outlines without replacing them. Route changes move focus to the page `h1` (`tabindex="-1"`) and announce the title.
- **Keyboard**: everything mouse can do, keyboard can do. Tabs, segmented controls and swatch groups use roving tabindex with arrow keys (built into `UiTabs`, `UiSegmented`, `UiColorPicker`). Canvas layers in the Shirt Studio are also listed as buttons in the Layers row, so selection, nudge and delete work without a pointer. Shortcut sheet behind `?`.
- **Studio ARIA**: control panel tabs = `role="tablist"`; accessory/background/frame grids = `role="radiogroup"` with `aria-label` ("Hat") and tiles `role="radio"` named by label ("Party hat"); colour pickers are `fieldset`/`legend`; sliders have `aria-valuetext` ("70 percent"). The preview stage is `role="img"` with a live `aria-label` summary ("Stegosaurus, green with cream belly, party hat, polka background, circle frame"), updated debounced 1s, and history actions announce via a polite live region ("Undid: body colour").
- **Dialogs**: `UiModal` and modal `UiBottomSheet` trap focus, close on Esc, restore focus, use `aria-modal` and a labelled title; destructive confirms use `role="alertdialog"` and focus the safe option.
- **Images**: avatars get alt "Mira's avatar: a Stegosaurus in a party hat"; decorative spots use `alt=""`.
- **Motion**: every animation in this spec respects `prefers-reduced-motion` and the in-app toggle (`html[data-motion="reduce"]`, helpers in `src/components/ui/motion.js`). Choreographed moments (egg hatch, sticker slaps, staggers) must branch in JS with `prefersReducedMotion()` and jump to the end state. No flashing, no looping motion except the 3.2s empty-state bob (which stops under reduced motion).
- **Touch**: targets at least 44×44px on phones (icon buttons `md` and up); bottom sheet grip is a real button.

## 9. Primitive inventory (src/components/ui)

`UiButton`, `UiIconButton`, `UiCard`, `UiBadge`, `UiChip`, `UiTabs`, `UiModal`, `UiBottomSheet` (modal or docked), `UiTooltip`, `UiToast` + `useToast` (`src/composables/useToast.js`), `UiSegmented`, `UiSlider`, `UiColorSwatch`, `UiColorPicker`, `UiField`, `UiInput`, `UiTextarea`, `UiSelect`, `UiProgress`, `UiSkeleton`, `UiEmptyState`, `UiStatBar`, `UiIcon` (38 icons, `icons.js`). Helpers: `color.js` (`contrastRatio`, `readableOn`, `normalizeHex`, `shade`, `LOW_CONTRAST_THRESHOLD`), `motion.js`, `useFocusTrap.js`. Each SFC documents its props in a header comment.
