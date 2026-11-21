# Dino Selector

A small team app: every teammate gets a spirit dinosaur. Add people to a team wall, let a 14-question quiz (or the Dinopedia) pick their dino, give them a custom dino avatar, and print team swag. Data is stored on the server (SQLite), so everyone who opens the app sees the same team.

## Features

- **Team wall and profiles**: cards for each person, dino facts, personality, trait bars (with the quiz answers overlaid), compatibility labels and a "how to work with me" note.
- **Quiz**: 14 questions, keyboard friendly, resumes after a reload, reveals a match with runners-up and a downloadable 1080x1350 result card. Works for a teammate or "just curious".
- **Dinopedia**: 121 catalogued dinos with search and filters; add your own dinos or override a picture.
- **Avatar Studio**: colours, accessories, scenes, frames, optional photo upload with crop, undo/redo, PNG (128-1024) and SVG export.
- **Shirt Studio**: six templates, text and decor layers, five fonts, T-shirt/hoodie/tote, low-contrast warning, print-ready 4500x5400 transparent PNG, SVG (text as outlines) and mockup export. Team edition exports one print file per teammate.
- **Insights**: diet, period and body-type stats, pairings matrix, a printable A3 poster and A4 fold-over name cards.

## Requirements

Node.js 22 or newer (the server uses the built-in `node:sqlite`). No native compilation, no external services. Fonts are bundled, so the app works offline.

## Run it

Development (Vite on http://localhost:5173 proxying to the API on port 3001):

```
npm install
npm run dev
```

Production (one process serves the API and the built frontend):

```
npm install
npm run build
node server/start-prod.js          # http://localhost:3001
```

`server/start-prod.js` sets `NODE_ENV=production` itself, so the same command works in cmd, PowerShell and bash. Rebuild (`npm run build`) after any source change; the server serves `dist/`.

### Docker

```
docker compose up --build          # http://localhost:8091
```

The image serves the app on `PORT` (3001 by default, 8091 in `docker-compose.yml`) and keeps everything under the `/data` volume (mapped to `./data` by the compose file).

### Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DATA_DIR` | `./data` (`/data` in Docker) | Folder holding the database and uploads |
| `DINO_REMOTE_SEED` | on | Set to `off` to skip the optional background enrichment from the public RESTasaurus API (adds non-catalog dinos; the app works without it) |

## Data and backups

Everything lives in `DATA_DIR`:

- `persons.db` (plus `persons.db-wal` / `persons.db-shm` while the server runs): people, designs, custom dinos, team name.
- `uploads/`: uploaded avatar photos.

To back up, stop the server (or copy while idle) and copy the whole folder. To restore, put the folder back. Databases from the original version of the app are upgraded in place at startup; nothing is dropped.

## Tests and catalog

```
node --test "server/test/*.test.js"    # API, migrations, uploads
node --test src/lib/compat.test.js     # pairing labels
node --test src/lib/quiz/quiz.test.js  # quiz scoring
node scripts/validate-catalog.mjs      # checks the dino catalog
node scripts/build-catalog.mjs         # regenerates dinos.js / bodyTypeHints.js from the .json sources
```

Edit `src/data/catalog/dinos.json` (or `bodyTypeHints.json`), run the build script, then the validator. The server imports the generated `.js` files at runtime.

## Layout

```
server/            Express API + node:sqlite (app.js, db.js, routes/, uploads.js, dinos.js); test/ holds API tests
src/views/         One file per route (Team, Person, AvatarStudio, ShirtStudio, Quiz, Dinopedia, Insights, ...)
src/components/    ui/ primitives, layout/, studio/ shell, person/, dinopedia/, insights/, quiz/
src/stores/        Pinia stores (persons, dinos, designs, team)
src/lib/           art/ (avatar rendering), shirt/ (templates, canvas/SVG render), quiz/, compat.js
src/data/catalog/  The dino catalog (shared with the server)
src/assets/art/    Dino illustrations and the accessory/frame/background/decor kit
scripts/           Catalog build and validation
docs/              ux-spec.md (behaviour), api.md (HTTP API), research.md (print specs)
```

The router uses hash URLs (`/#/people/...`), so the server only needs to serve `index.html` and the API.
