# Dino Selector — Agent Instructions

## Project Overview

A **Vue 3** single-page application where users add people (with a name and linked photo), pick a dinosaur for each person, and take a personality quiz to find their spirit dino match. People and their dino assignments are stored server-side in SQLite so the data is shared across browsers and survives container restarts.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) | No Options API |
| Build Tool | Vite | Standard Vue 3 scaffold |
| State | Pinia | No persistence plugin — persons are server-backed |
| Styling | Tailwind CSS v3 | Custom dark earthy palette |
| Routing | Vue Router 4 | Hash-mode is fine |
| HTTP | Native `fetch` | No Axios |
| Backend | Express.js (`server/index.js`) | REST API for person CRUD + dino proxy |
| Database | `node:sqlite` (built-in Node 22+) | `DatabaseSync` — no native compilation needed |

> **Do NOT use `better-sqlite3`** — it requires native C++ compilation and fails on Node 24 due to C++20/C++17 standard conflicts. Use the built-in `node:sqlite` module (`import { DatabaseSync } from 'node:sqlite'`).

---

## External API — RESTasaurus

> **The original DinoAPI (`dinoapi.brunosouzadev.com`) is offline.** The replacement is RESTasaurus.

**Base URL:** `https://restasaurus.onrender.com/api/v1`

Key endpoint used:
```
GET /dinosaurs    → paginated list (50 per page, page 1 returns A-named dinos only)
```

No API key required. No auth.

**RESTasaurus data shape (raw):**
```json
{
  "id": 1,
  "name": "Aardonyx",
  "diet": "Herbivore",
  "temporalRange": "Early Jurassic",
  "locomotionType": "terrestrial",
  "description": "...",
  "image": { "imageURL": "https://..." },
  "source": { "wikipediaURL": "https://en.wikipedia.org/wiki/Aardonyx" }
}
```

**Important quirks:**
- Results are alphabetical. Page 1 = A-names only. T. rex / Velociraptor appear around page 21–22.
- `nextPage` is a **relative path** (`/api/v1/dinosaurs?page=2`) — use it directly with `fetch(nextPath)`; the Vite/Express proxy handles routing.
- The API runs on Render's free tier — expect a cold-start delay of 10–30 s on first load.
- The original DinoAPI S3 bucket (`brunosouzadev-dinoapi.s3.sa-east-1.amazonaws.com`) returns **403** — those image URLs are dead. Do not use them.

**Normalization (`dinoStore.js`):**

RESTasaurus' shape differs from the original DinoAPI. A `normalizeDino()` function converts it:

```js
function normalizeDino(raw) {
  // temporalRange → period ('cretaceous' | 'jurassic' | 'triassic')
  // raw.image.imageURL → image
  // raw.source.wikipediaURL → wikipediaUrl
  // raw.locomotionType → type
  return { _id, name, weight: null, height: null, length: null,
           diet, period, existed, region: '', type,
           description, image, wikipediaUrl, isPopular: false }
}
```

**Fallback dataset (`src/data/dinoFallback.js`):**

18 well-known dinos (T. rex, Velociraptor, Triceratops, Brachiosaurus, Pterodactyl, Spinosaurus, etc.) covering all diet types, eras, and locomotion types. Used two ways:
1. Shown immediately while background pages are still loading (bridges the gap until pages 21–22 arrive).
2. Full fallback if the API is completely unreachable.

The fallback dinos use the **DinoAPI shape** (weight, height, length, region, type, isPopular all populated) — not the RESTasaurus shape.
> **Note:** The fallback image URLs (`brunosouzadev-dinoapi.s3…`) are dead (403). They are only ever shown briefly until the background page fetch replaces them with valid RESTasaurus images.

**Caching:** fetch once on app boot in `dinoStore.fetchDinos()`. Never re-fetch on navigation.

---

## CORS & Dev Proxy

RESTasaurus doesn't send CORS headers that satisfy browser restrictions. In dev, Vite proxies both the dino API and the local Express server:

```js
// vite.config.js
server: {
  proxy: {
    '/persons': { target: 'http://localhost:3001', changeOrigin: false },
    '/api':     { target: 'https://restasaurus.onrender.com', changeOrigin: true, secure: true },
  },
}
```

In production, Express itself proxies `/api/*` to RESTasaurus and serves the Vite dist.

---

## Backend — Express + SQLite

**Entry point:** `server/index.js`

- Uses `node:sqlite` (`DatabaseSync`) — synchronous, no async wrappers needed.
- Database file: `$DATA_DIR/persons.db` (default `./data/persons.db` in dev).
- WAL mode enabled: `db.exec('PRAGMA journal_mode = WAL')`.

**Person REST API:**

| Method | Path | Action |
|---|---|---|
| GET | `/persons` | List all persons |
| POST | `/persons` | Create person `{ id, name, photoUrl, dinoName }` |
| PATCH | `/persons/:id` | Update any subset of `{ name, photoUrl, dinoName }` |
| DELETE | `/persons/:id` | Delete person |

**Production mode** (`NODE_ENV=production`): Express also proxies `/api/*` to RESTasaurus and serves the Vite `dist/` as static files.

**Dev:** run Vite and Express concurrently:
```
npm run dev   →  concurrently "vite" "node server/index.js"
```

---

## Deployment — Docker

Multi-stage Dockerfile (Node 22 Alpine):
- Stage 1 (`build`): installs all deps, runs `npm run build` → produces `dist/`
- Stage 2 (`runtime`): prod deps only, copies `server/` + `dist/`, runs `node server/index.js`

No native build tools needed (no `python3 make g++`) because `node:sqlite` is built-in.

**Environment variables:**
| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables static serving + API proxy in Express |
| `PORT` | `3001` | Express listen port |
| `DATA_DIR` | `/data` | SQLite database directory |

**Persistence:** mount a named volume at `/data` so the SQLite file survives container restarts:
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3001:3001"]
    volumes: ["dino_data:/data"]
volumes:
  dino_data:
```

---

## App Structure

```
dino_selector/
├── server/
│   └── index.js              # Express API + production static server
├── src/
│   ├── main.js
│   ├── App.vue               # shell: nav + router-view
│   ├── router/index.js
│   ├── stores/
│   │   ├── dinoStore.js      # dino list from RESTasaurus + fallback, loading/error state
│   │   └── personStore.js    # persons array, backed by Express REST API
│   ├── data/
│   │   └── dinoFallback.js   # 18 well-known dinos (DinoAPI shape)
│   ├── components/
│   │   ├── PersonCard.vue    # card: avatar, name, dino chip, description, edit button
│   │   ├── DinoCard.vue      # dino tile: image, name, diet badge, Wikipedia link
│   │   ├── DinoSearch.vue    # searchable + filterable dino picker modal
│   │   ├── AvatarFallback.vue
│   │   └── QuizQuestion.vue  # single quiz step
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── AddPersonView.vue
│   │   ├── EditPersonView.vue
│   │   ├── PersonDetailView.vue
│   │   └── QuizView.vue
│   └── composables/
│       └── useDinoQuiz.js    # 12-question quiz logic
├── Dockerfile
├── docker-compose.yml
├── vite.config.js            # dev proxy config
└── package.json
```

---

## Routes

| Path | View | Notes |
|---|---|---|
| `/` | `HomeView` | Main roster |
| `/add` | `AddPersonView` | Add new person |
| `/person/:id/edit` | `EditPersonView` | Edit name, photo, dino |
| `/person/:id` | `PersonDetailView` | Read-only detail page |
| `/quiz` | `QuizView` | Personality quiz (standalone) |

---

## Feature Spec

### 1. Roster (`HomeView`)

- Responsive grid of `PersonCard` components (2 cols mobile → 4 cols desktop).
- Each card shows: circular avatar, name, assigned dino chip + thumbnail, diet badge, short dino description (2-line clamp), edit button.
- FAB: **"+ Add Person"**.
- Empty state: friendly illustration + CTA.

### 2. Add / Edit Person

- Fields: Name (required, max 50 chars), Photo URL (optional, live preview), Dinosaur (optional).
- Dino picker: slide-over drawer with real-time name search + diet/period filter chips.
- **Search filtering is done directly in `DinoSearch.vue`'s `computed()` by accessing `dinoStore.dinos`** — do NOT use a Pinia getter-factory (a getter that returns a function) for this; it breaks Vue's reactivity dependency tracking and the search stops updating.
- After selection a short dino description is shown in the form (3-line clamp).
- Save / Cancel buttons.

### 3. Person Detail (`PersonDetailView`)

- Hero: avatar + name.
- Full dino info card: image, name, diet, period, region, weight, length, existed, Wikipedia pill link, description.
- "Change Dino" → opens picker. "Edit Profile" → EditPersonView.

### 4. Dino Quiz (`QuizView`)

12-question personality quiz. Standalone — no person needed upfront. At the end the user can assign the result to an existing person.

#### Quiz Logic (`useDinoQuiz.js`)

Each answer maps to a `traits` object. Scores are accumulated across 4 dimensions:

| Dimension | Values | How it's used |
|---|---|---|
| `diet` | herbivore · carnivore · omnivore | Primary filter — must match dino's diet |
| `mobility` | runner · flyer · swimmer · walker | Secondary filter — matched against dino's `type` field |
| `energy` | high · low | Tertiary — size proxy when no explicit size voted |
| `size` | small · medium · large · massive | Sort target; mapped from dino's `length` field |

**Mobility → `type` mapping:**
- `flyer` → `type` contains "fly" or "aerial" (e.g. Pterodactyl)
- `swimmer` → `type` contains "aquatic", "semi", "marine" (e.g. Spinosaurus)
- `runner` → `type === 'terrestrial'` AND small/medium length
- `walker` → `type === 'terrestrial'` AND large/massive length

**Scoring algorithm:**
1. Filter dino pool by dominant `diet`.
2. If any `mobility` votes exist, filter further by matching `type`.
3. Sort by closest size match (if no explicit `size` votes, infer: `energy: high` → small, `energy: low` → large).
4. Prefer `isPopular: true` in the top 3.

**Questions (12 total, alternating nutrition/activity):**

| # | Theme | Focus |
|---|---|---|
| 1 | Nutrition | Ideal meal |
| 2 | Activity | Favourite way to move |
| 3 | Nutrition | Hunger behaviour |
| 4 | Activity | Dream trip |
| 5 | Nutrition | Buffet choices |
| 6 | Activity | Energy levels through the day |
| 7 | Nutrition | Portion sizes |
| 8 | Activity | Exercise preference |
| 9 | Nutrition | Diet philosophy |
| 10 | Activity | Rest day behaviour |
| 11 | Nutrition | Snack preference |
| 12 | Activity | How friends describe your energy |

#### Quiz UI

- Progress bar: "Question N / 12".
- Slide transition between questions.
- Answer options as large clickable cards (not radio buttons).
- Result screen: spirit dino name + image, stats ribbon, description excerpt, assign-to-person dropdown, Retake / Back to Roster CTAs.

---

## State Management (Pinia)

### `dinoStore`

```js
state: { dinos: [], loading: false, error: null }

actions:
  fetchDinos()              // Fetches page 1, shows app; fires _fetchRemainingPages() in background
  _fetchRemainingPages(path) // Follows nextPage links until exhausted, then rebuilds this.dinos
  getDinoByName(name)        // case-insensitive find from cached list
```

**Loading strategy:** page 1 (50 A-names) + fallback dinos are shown immediately. Background fetch streams pages 2–N; when complete it replaces fallback entries with real API entries (valid images). The store is reactive so the UI updates automatically.

### `personStore`

> **No localStorage persistence.** All data lives in the Express/SQLite backend.

```js
state: { persons: [] }

// Person shape:
{ id: String (UUID), name: String, photoUrl: String, dinoName: String | null }

actions:
  fetchPersons()                        // GET /persons  — called once in App.vue onMounted
  addPerson({ name, photoUrl, dinoName })   // POST /persons — optimistic add + rollback on error
  updatePerson(id, patch)               // PATCH /persons/:id
  removePerson(id)                      // DELETE /persons/:id
  assignDino(personId, dinoName)        // PATCH /persons/:id with { dinoName }
```

All actions do **optimistic UI updates** and roll back on network failure.

---

## Design Guidelines

**Aesthetic: Prehistoric Museum meets modern card game.**

- Dark earthy base (`#1a1208`) with amber/gold accents (`#d97706`) and fossil-bone cream (`#f5f0e8`).
- Serif display font **"Playfair Display"** for headings; **"DM Sans"** for body.
- Dino cards: subtle hover lift (`translateY(-4px)` + shadow).
- Diet badges: green (herbivore), red (carnivore), amber (omnivore).
- Loading skeleton screens while dinos fetch.
- Accessible: all interactive elements have `aria-label` or visible text; color is never the only indicator.

---

## Known Issues & Decisions

| Issue | Decision |
|---|---|
| DinoAPI offline | Replaced with RESTasaurus; fallback dataset bridges startup gap |
| DinoAPI S3 image bucket returns 403 | All `brunosouzadev-dinoapi.s3…` image URLs are dead — don't add new ones |
| RESTasaurus page 1 is A-names only (pages 1–20 are A–S) | Fetch page 1 immediately; stream pages 2–N in background via `_fetchRemainingPages` |
| RESTasaurus cold start (Render free tier) | Show loading state; app retries via user-visible error banner |
| `better-sqlite3` fails on Node 24 | Use built-in `node:sqlite` (`DatabaseSync`) — no compilation |
| Pinia getter-factory stale reactivity | Move filter logic into component `computed()`, read `dinoStore.dinos` directly |
| Search case-sensitivity | All dino names stored lowercase; queries lowercased before compare |

---

## Out of Scope

- User authentication / multi-user isolation.
- Photo uploads (URL input only).
- Editing or adding dinos (read-only from API).
- Paginating RESTasaurus beyond page 1.
