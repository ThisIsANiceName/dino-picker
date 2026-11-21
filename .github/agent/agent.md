# Dino Selector: agent notes

Vue 3 (`<script setup>`) + Pinia + Vue Router (hash mode) + Tailwind + Vite frontend; Express 4 + built-in `node:sqlite` backend (Node 22+). See `README.md` for running it and `docs/ux-spec.md`, `docs/api.md`, `docs/research.md` for the specs.

## Rules of thumb

- Do not use `better-sqlite3` or other native modules; the DB is `DatabaseSync` from `node:sqlite`.
- The client only talks to this server (`/persons`, `/dinos`, `/designs`, `/team`, `/uploads`, `/health`). It never calls external APIs. Every new API prefix must be added to `API_PREFIXES` in `server/app.js` and to the proxy list in `vite.config.js`.
- The dino catalog (`src/data/catalog/`) is the source of truth for dinos and is imported by the server at runtime, so the Dockerfile copies it. Edit the `.json` files, then run `node scripts/build-catalog.mjs` and `node scripts/validate-catalog.mjs`.
- DB migrations are idempotent and run at startup (`server/db.js`); legacy databases must keep working. Never drop data.
- Stored data: `persons` (avatar/quiz as JSON), `designs` (shirt configs as JSON), `dinos` (catalog + custom + optional remote), `meta`. Uploaded photos live in `DATA_DIR/uploads`.
- Windows must keep working: use `node:path` for paths, no shell-specific scripts (use `server/start-prod.js`).
- UI primitives are in `src/components/ui` (`/design-system` shows them). Link-style buttons render real `<a href>`. Unique ids for a11y must come from module-scope counters (a `let` inside `<script setup>` resets per instance).
- Respect reduced motion, keep focus visible, give every control an accessible name.

## Layout

`server/` API; `src/views/` one file per route; `src/stores/` Pinia; `src/lib/art` avatar rendering; `src/lib/shirt` shirt templates and canvas/SVG export (print master 4500x5400); `src/lib/quiz` quiz questions and scoring; `src/components/studio` shared studio shell, undo/redo and leave guard.

## Checks before finishing

```
npm run build
node --test "server/test/*.test.js"
node --test src/lib/compat.test.js
node --test src/lib/quiz/quiz.test.js
```