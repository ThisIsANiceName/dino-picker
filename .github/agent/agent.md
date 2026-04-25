# 🦕 Dino Selector — Agent Instructions

## Project Overview

Build a **Vue 3** single-page application called **Dino Selector** where users add people (with a name and a linked photo), pick a dinosaur for each person, and later take a personality quiz to find their perfect dino match.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) | No Options API |
| Build Tool | Vite | Standard Vue 3 scaffold |
| State | Pinia | Persist persons & their dinos to `localStorage` |
| Styling | Tailwind CSS | Use Tailwind v3; add a custom palette |
| Routing | Vue Router 4 | Hash-mode is fine |
| HTTP | Native `fetch` | No Axios; keep it lean |

---

## External API — DinoAPI

**Base URL:** `https://dinoapi.brunosouzadev.com/api`

Key endpoints used:

```
GET /dinosaurs            → full list (name, image, diet, period, weight, length, description, isPopular)
GET /dinosaurs/popular    → only popular dinos (good for the quiz shortlist)
GET /dinosaurs/:name      → single dino detail
```

No API key required. No auth. CORS is open.

**Data shape (per dino):**
```json
{
  "_id": "65ab56b3978ff91b1c9eb074",
  "name": "aardonyx",
  "weight": "1700kg",
  "height": "2m",
  "length": "8.0m",
  "diet": "herbivore",
  "period": "jurassic",
  "existed": "201.3 - 190.8 million years ago",
  "region": "south africa",
  "type": "terrestrial",
  "description": "...",
  "image": "https://brunosouzadev-dinoapi.s3.sa-east-1.amazonaws.com/images/aardonyx.jpg",
  "isPopular": false
}
```

**Caching:** fetch all dinos once on app boot, store in Pinia (`dinoStore`). Don't re-fetch on every navigation.

---

## Person Photo

Persons link to a **photo URL** (not an upload). The UI should:
1. Show a text input for the URL.
2. Instantly preview the image with a graceful fallback (initials avatar) if the URL is broken or empty.
3. Display the photo as a circle avatar everywhere a person appears.

---

## App Structure

```
src/
├── main.js
├── App.vue                  # shell: nav + router-view
├── router/index.js
├── stores/
│   ├── dinoStore.js         # dino list from API, loading/error state
│   └── personStore.js       # persons array, persisted to localStorage
├── components/
│   ├── PersonCard.vue        # card: avatar, name, assigned dino chip + edit button
│   ├── DinoCard.vue          # dino tile: image, name, diet badge, period badge
│   ├── DinoSearch.vue        # searchable + filterable dino picker modal/drawer
│   ├── AvatarFallback.vue    # initials circle when photo URL is missing/broken
│   └── QuizQuestion.vue      # single quiz step component
├── views/
│   ├── HomeView.vue          # roster grid
│   ├── AddPersonView.vue     # form: name + photo URL
│   ├── EditPersonView.vue    # same form, pre-filled
│   ├── PersonDetailView.vue  # full detail: person + their dino info card
│   └── QuizView.vue          # multi-step personality quiz
└── composables/
    └── useDinoQuiz.js        # quiz logic (questions, scoring, result mapping)
```

---

## Routes

| Path | View | Notes |
|---|---|---|
| `/` | `HomeView` | Main roster |
| `/add` | `AddPersonView` | Add new person |
| `/person/:id/edit` | `EditPersonView` | Edit name, photo, dino |
| `/person/:id` | `PersonDetailView` | Read-only detail page |
| `/quiz` | `QuizView` | Personality quiz (standalone, no person required) |

---

## Feature Spec

### 1. Roster (`HomeView`)

- Responsive grid of `PersonCard` components (2 cols mobile → 4 cols desktop).
- Each card shows:
  - Circular avatar (photo or initials fallback).
  - Person name.
  - Assigned dino name + small dino thumbnail (or "No dino yet" placeholder).
  - Diet badge (🌿 herbivore / 🥩 carnivore / 🍽️ omnivore).
  - Quick-edit pencil icon → goes to `EditPersonView`.
  - Click card body → goes to `PersonDetailView`.
- FAB or prominent button: **"+ Add Person"**.
- Empty state: friendly illustration + "Add your first person" CTA.

### 2. Add / Edit Person

- Fields:
  - **Name** (required, max 50 chars).
  - **Photo URL** (optional, with live preview + fallback).
  - **Dinosaur** (required to save a dino; optional for "person only").
- Dino picker:
  - Opens as a slide-over drawer or modal.
  - Search input filters by name in real-time.
  - Filter chips: diet (All / Herbivore / Carnivore / Omnivore) and period (All / Triassic / Jurassic / Cretaceous).
  - Results shown as a scrollable grid of `DinoCard` tiles.
  - Clicking a tile selects it, closes the drawer, and shows the selection in the form.
- Save / Cancel buttons.

### 3. Person Detail (`PersonDetailView`)

- Large hero: person avatar + name.
- Full dino info card below:
  - Dino image (large).
  - Name, diet, period, region, weight, length, existed.
  - Scrollable description text.
- "Change Dino" button → opens picker.
- "Edit Profile" button → goes to `EditPersonView`.

### 4. Dino Quiz (`QuizView`)

The quiz determines a person's spirit dino through 6–8 personality questions. It is **standalone** — it does not require being associated with a person, but at the end the user can optionally save the result to an existing person.

#### Quiz Logic (`useDinoQuiz.js`)

Each question presents 4 answer options. Each answer maps to a set of dino traits/tags (diet, size, era, personality archetype). Accumulate a score vector across answers, then find the best-matching dino from the API list.

**Suggested trait dimensions:**

| Dimension | Values |
|---|---|
| `diet` | herbivore · carnivore · omnivore |
| `size` | tiny · medium · large · massive |
| `era` | triassic · jurassic · cretaceous |
| `style` | solitary · pack · ambush · slow-and-steady |

**Sample questions (implement at least 6):**

1. *"At a party, you are most likely to..."*
   - A) Hunt for the best snacks alone → carnivore, solitary
   - B) Graze the buffet with your whole squad → herbivore, pack
   - C) Whatever everyone else is doing → omnivore, pack
   - D) Leave early and find a quiet corner → solitary, slow-and-steady

2. *"Your ideal weekend looks like..."*
   - A) Sprinting through a forest trail → carnivore, medium
   - B) A long, peaceful countryside walk → herbivore, large
   - C) Staying home with snacks and a movie → herbivore, slow-and-steady
   - D) An underground cave adventure → omnivore, ambush

3. *"When something goes wrong at work, you..."*
   - A) Charge straight at the problem → carnivore, ambush
   - B) Rally the team and tackle it together → pack, omnivore
   - C) Take your time and plan carefully → slow-and-steady, large
   - D) Adapt on the fly → omnivore, medium

4. *"Your fashion sense is best described as..."*
   - A) Bold and spiky → carnivore, solitary
   - B) Armored and dependable → herbivore, large
   - C) Long, elegant, understated → herbivore, slow-and-steady
   - D) Compact and agile → carnivore, medium

5. *"Favorite movie genre?"*
   - A) Thriller / Action → carnivore, ambush
   - B) Documentary / Nature → herbivore, slow-and-steady
   - C) Comedy with friends → pack, omnivore
   - D) Sci-Fi from a forgotten era → triassic, solitary

6. *"Pick your superpower:"*
   - A) Super speed → small/medium, carnivore
   - B) Invincible armor → large, herbivore
   - C) Mind control → solitary, ambush
   - D) Healing factor → omnivore, pack

#### Scoring algorithm

```js
// useDinoQuiz.js (outline)
const TRAIT_WEIGHTS = {
  diet: { herbivore: 0, carnivore: 0, omnivore: 0 },
  size: { tiny: 0, medium: 0, large: 0, massive: 0 },
  era: { triassic: 0, jurassic: 0, cretaceous: 0 },
  style: { solitary: 0, pack: 0, ambush: 0, 'slow-and-steady': 0 },
}

// Each answer increments relevant trait counters.
// After all answers, compute the dominant trait per dimension.
// Filter the dino list for matching diet + era, then sort by closest size match.
// Return top 3 candidates; display the #1 as the spirit dino.
```

#### Quiz UI

- Progress bar at the top (e.g. "Question 3 / 6").
- Animated transition between questions (slide-left).
- Answer options as large clickable cards (not radio buttons).
- Result screen:
  - "Your spirit dinosaur is... **Velociraptor**!" with large dino image.
  - Dino stats ribbon (diet, period, region).
  - Description excerpt.
  - CTA buttons:
    - **"Assign to me"** → dropdown of existing persons, saves dino to selected person.
    - **"Retake Quiz"** → resets state.
    - **"Back to Roster"** → navigate to `/`.

---

## Design Guidelines

**Aesthetic direction: Prehistoric Museum meets modern card game.**

- Dark earthy base (`#1a1208`) with amber/gold accents (`#d97706`) and fossil-bone cream (`#f5f0e8`).
- Use a serif display font (e.g. Google Fonts **"Playfair Display"**) for headings.
- Body text: **"DM Sans"** or **"Nunito"**.
- Dino cards have a slight texture overlay (CSS noise or a subtle SVG pattern).
- Subtle hover animations: card lifts with `translateY(-4px)` + shadow increase.
- Diet badges use color: 🌿 green for herbivore, 🥩 red for carnivore, 🍽️ amber for omnivore.
- Period badges: muted clay tones.
- Loading skeleton screens while dinos fetch (don't show spinners alone).
- Accessible: all interactive elements must have `aria-label` or visible text; color is never the only indicator.

---

## State Management (Pinia)

### `dinoStore`
```js
state: {
  dinos: [],          // full list from API
  loading: false,
  error: null,
}
actions:
  fetchDinos()        // GET /dinosaurs, only if dinos.length === 0
  getDinoByName(name) // find from cached list
```

### `personStore`
```js
state: {
  persons: [],        // persisted to localStorage via pinia-plugin-persistedstate
}
// Person shape:
{
  id: crypto.randomUUID(),
  name: '',
  photoUrl: '',
  dinoName: null,     // string matching dino.name from API
}
actions:
  addPerson(person)
  updatePerson(id, patch)
  removePerson(id)
  assignDino(personId, dinoName)
```

---

## Error & Loading States

- If the DinoAPI is unavailable (fetch error), show a friendly banner: *"🦴 The dinosaurs are hiding — API unavailable. Try again later."* with a retry button.
- The dino picker should still let the user search within the cached list if already loaded.
- If a dino image 404s, fall back to a placeholder SVG of a generic dino silhouette (inline in `DinoCard.vue`).

---

## Accessibility & UX Requirements

- All modals/drawers trap focus and close on `Escape`.
- Keyboard navigable dino grid (arrow keys move between tiles, `Enter`/`Space` selects).
- `prefers-reduced-motion`: disable slide animations, keep fade only.
- Mobile-first: the dino picker opens as a bottom sheet on screens < 640 px.

---

## Implementation Order (phases)

### Phase 1 — Core
1. Scaffold Vite + Vue 3 + Tailwind + Pinia + Vue Router.
2. Implement `dinoStore` with API fetch.
3. Build `DinoCard.vue` and verify images load.
4. Build `personStore` with localStorage persistence.
5. `HomeView`: empty state + `PersonCard` grid.
6. `AddPersonView` + `EditPersonView` with dino picker drawer.
7. `PersonDetailView`.

### Phase 2 — Quiz
8. Design quiz questions and trait mapping in `useDinoQuiz.js`.
9. Build `QuizView` with `QuizQuestion.vue` sub-component.
10. Result screen + assign-to-person flow.

### Phase 3 — Polish
11. Skeleton loaders, error banners, fallback images.
12. Animations (Vue `<Transition>`, Tailwind transitions).
13. Accessibility audit (focus traps, `aria-*`, keyboard nav).
14. Mobile bottom sheet for dino picker.
15. Final visual polish (textures, typography, badges).

---

## Out of Scope

- User authentication / multi-user.
- Server-side persistence (localStorage only).
- Uploading photos (URL input only).
- Editing or adding dinos (read-only from API).
