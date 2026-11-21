# Dino Selector API

Express 4 + `node:sqlite`. All bodies are JSON unless noted (limit 1 MB). Errors: `{ "error": "message" }` with status 400 (bad input), 404 (unknown id / route), 409 (conflict), 413 (too large), 415 (bad media type), 500 (generic, no stack trace).

Env: `PORT` (3001), `DATA_DIR` (`./data`; holds `persons.db` and `uploads/`), `NODE_ENV=production` (serves `dist/` with SPA fallback; API paths never fall back to HTML), `DINO_REMOTE_SEED=off` (disable optional RESTasaurus enrichment).

DB migrations are idempotent and run at startup (`meta.schema_version`, currently 2); a legacy DB is upgraded in place with no data loss.

## Health
`GET /health` -> `{ ok: true, dinos: <count> }`

## Dinos
The bundled catalog (121 entries) is upserted at every start; catalog rows are authoritative and are never overwritten or deleted by the remote API. Optional RESTasaurus enrichment adds non-catalog genera in the background (one warning line if unreachable).

- `GET /dinos` -> array of Dino, ordered by name
- `GET /dinos/:id` -> Dino (404)
- `POST /dinos` -> 201 Dino (custom). Body: `name` (required, 1-80, stored lowercase), optional `diet period existed region type description image wikipediaUrl weight height length bodyType isPopular`. `bodyType` must be one of `tyrannosaur raptor sauropod ceratopsian stegosaur ankylosaur hadrosaur pachycephalosaur spinosaur ornithomimid pterosaur marine`. 409 if name exists.
- `PATCH /dinos/:id` -> Dino. Any subset of the POST fields. For `source: "catalog"` rows only `image` is persisted (other fields are ignored). Customs may be renamed (409 on clash).

Dino: `_id, name` (lowercase genus, link key), `displayName, source` (`catalog|api|custom`), `diet, period, existed, region, type, description, image, wikipediaUrl, weight, height, length, isPopular, bodyType, palette {body, belly, accent}`; catalog rows also: `commonName, pronunciation, meaning, group, epoch, myaFrom, myaTo, namedYear, regions[], lengthM, heightM, weightKg, speedKmh, funFact, traits{}, personality{archetype, tagline, strengths[], quirk, teamRole}, isDinosaur`.
Non-catalog dinos get `bodyType` from `bodyTypeFor(name)` and a deterministic palette from a hash of the name.

## Persons
Person: `{ id, name, photoUrl, dinoName, avatar, note, quiz, createdAt, updatedAt }`. `photoUrl` is `/uploads/<file>` when a photo is uploaded, otherwise the legacy external URL (or `""`).

- `GET /persons` -> Person[]
- `GET /persons/:id` -> Person
- `POST /persons` -> 201 Person. Body: `name` (required, trimmed 1-60), optional `id` (`[A-Za-z0-9_-]{1,64}`, default UUID; 409 if taken), `photoUrl` (http(s), <=2048), `dinoName` (lowercased, <=80, null allowed), `avatar` (JSON object, <=20 KB), `note` (<=500 chars), `quiz` (JSON object, <=20 KB).
- `PATCH /persons/:id` -> Person. Any subset of the above (`avatar`/`quiz` null clears).
- `DELETE /persons/:id` -> `{ ok: true }`. Deletes the person's designs and uploaded photo file.
- `PUT /persons/:id/photo` -> Person. Raw body, `Content-Type` `image/png|image/jpeg|image/webp`, max 5 MB; magic bytes must match the type (else 400); other types 415; oversize 413. Stored as `DATA_DIR/uploads/<personId>-<random>.<ext>`, previous file deleted. The client is expected to crop and re-encode via canvas first (this strips EXIF); the server does not re-encode.
- `DELETE /persons/:id/photo` -> Person (falls back to legacy `photoUrl`).
- `GET /uploads/<file>` static, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=31536000, immutable` (filenames are unique per upload).

## Designs
Design: `{ id, personId|null, name, kind, config, createdAt, updatedAt }`.

- `GET /designs?personId=` -> Design[] (all when no filter)
- `GET /designs/:id` -> Design
- `POST /designs` -> 201 Design. Body: `config` (required JSON object, <=100 KB), optional `personId` (must exist, or null), `name` (<=80), `kind` (default `shirt`, lowercase identifier).
- `PATCH /designs/:id` -> Design. Any subset of `config name kind personId`.
- `DELETE /designs/:id` -> `{ ok: true }`

## Team
- `GET /team` -> `{ name, year }` (defaults `"Our Team"`, current year)
- `PUT /team` -> `{ name, year }`. `name` trimmed 1-60, `year` integer 1900-2100; either may be omitted.
