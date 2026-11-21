# Dino Selector upgrade: research

Scope assumed: one small team, no accounts, no payments, no print-shop API, about one week of build.

## Findings

1. **Comparable products**
   - Avatar makers (Picrew, DiceBear, Notion-style) win on a small set of coherent parts, a starting preset, and instant live preview; DiceBear's playground is just style, tweak options, live preview, download SVG ([DiceBear tools](https://www.dicebear.com/tools/)). Mii-style icons for choices make options feel deliberate ([UX of virtual identity](https://uxdesign.cc/the-ux-of-virtual-identity-systems-584fd83f04ff)).
   - Merch designers (Printful, Printify, Custom Ink) all show the artwork on a garment mockup and warn when art leaves the safe print area ([Printful placement](https://www.printful.com/blog/t-shirt-design-placement-guide)).
   - Takeaway: preview-on-product plus one-click export is the expected loop.

2. **Print-on-demand specs**
   - Printify's PNG guide: 4500x5400 px at 300 DPI (15x18 in), transparent PNG-24, sRGB, no semi-transparent pixels ([Printify](https://printify.com/knowledge-hub/png-file-setup-for-tshirts/)).
   - Printful: 150-300 DPI, PNG for apparel, sRGB, under 200 MB; the 15x18 in front area is for select DTG products, 12x16 in for most tees ([Printful file help](https://help.printful.com/hc/en-us/articles/28491464259740-How-should-I-prepare-my-print-file-for-the-best-results), [15x18 area](https://help.printful.com/hc/en-us/articles/18532732956828-What-should-I-know-about-the-standard-15-18-print-placement-for-DTG-products)).
   - Full-front prints start about 3-4 in below the collar; centre chest 6x6 to 10x8 in; left chest 2.5-5 in ([Printful placement](https://www.printful.com/blog/t-shirt-design-placement-guide)).
   - Dark shirts: any non-zero opacity triggers white underbase, so glows and soft shadows print as chalky halos; use hard edges. Dark artwork on dark shirts looks dull; pale artwork vanishes on light shirts, so offer a per-shirt-colour palette check.
   - Neon RGB prints duller than screen. Fine-line detail gets lost in fabric texture.
   - Printful's help page gives no SVG or numeric margin/min-line rule; the margin and stroke numbers below are my recommendations, not sourced.

3. **Avatar export sizes and editor feel**
   - Slack wants 512-1024 px square ([Slack](https://slack.com/help/articles/115005506003-Edit-your-profile)); LinkedIn 400x400, circle crop; Discord 128 px minimum, circle crop ([Linearity](https://www.linearity.io/guide/social-media-image-sizes), [Discord](https://www.linearity.io/blog/discord-size-guide)); Teams has no official pixel spec, keep it square, PNG, under 4 MB ([MS Q&A](https://learn.microsoft.com/en-us/answers/questions/1613853/how-to-fix-microsoft-teams-profile-photo-being-blu)).
   - Good editors: categorised parts, preset starting point, randomise, undo/redo, live preview. DiceBear's seed idea (same input gives same avatar) is cheap and gives a stable default per person.
   - Everything is shown in circle crop, so keep the subject centred with a safe zone.

4. **Quiz design**
   - Completion matters more than depth: an 80-question quiz had about 30% completion; mixing question types and putting scenario questions mid-quiz kept engagement up ([DEV case study](https://dev.to/jakub_inithouse/how-we-designed-a-personality-quiz-that-people-actually-finish-balancing-depth-and-completion-4jm0)).
   - Sharing is driven by identity expression plus belonging and uniqueness together: a playful label, a bold shareable graphic, and a comparison with others ([Fortune on Wrapped](https://fortune.com/2025/12/03/why-spotify-wrapped-marketing-genius-individuality-uniqueness-belonging-psychology/)).
   - Takeaway: keep the quiz short (10-12 questions), show a trait breakdown (diet/energy/mobility/size are already tracked), a named result card, and "who in the team is your closest dino".

5. **Team features**
   - "How to work with me" manuals work because they surface quirks and preferences and build camaraderie ([Todoist](https://www.todoist.com/it/inspiration/how-to-work-with-me-manual)). A playful profile card (dino, traits, a one-line "user manual", favourite snack) borrows that without being HR-ish.
   - Light, non-competitive extras fit best: team composition stats (e.g. 5 carnivores vs 3 herbivores), pairwise compatibility from the existing trait vectors, a poster/wall view, printable name cards. Avoid scores that rank people.

6. **Privacy, safety, accessibility**
   - OWASP upload advice: extension allowlist, verify real file type rather than trusting the Content-Type header, cap size, rename to a generated ID, store outside the webroot, re-encode to drop metadata ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)). Re-encoding also strips EXIF/GPS.
   - Accessibility: respect `prefers-reduced-motion` and give an on-page toggle; no flashing over 3 per second ([A11y Collective](https://www.a11y-collective.com/blog/wcag-animation/)). Keep text at 4.5:1 contrast and UI parts at 3:1 (WCAG 2.2), never use colour alone for meaning, give the SVG avatars alt text, and make the editor fully keyboard operable.

## Print specs

| Item | Value | Basis |
|---|---|---|
| Master canvas | 4500 x 5400 px | Printify |
| Resolution tag | 300 DPI (15 x 18 in) | Printify |
| Format | PNG-24, transparent background, sRGB | Printify/Printful |
| Default art box | 3600 x 4800 px (12 x 16 in), top-centred | Printful standard tee area |
| Inner safe margin | 150 px (0.5 in) inside art box | Recommendation |
| Alpha | Hard edges only: threshold alpha to 0 or 255 on export; no glows/blurs/soft shadows | Printify |
| Min stroke / text | 12 px stroke, 90 px (about 22 pt) text height | Recommendation |
| Alt sizes | Left chest 1200x1200 (4 in), centre chest 2400x2400 (8 in) | Printful placement |
| Shirt colours | Preview on white, black, navy, grey, green; warn if art contrast to shirt is low | Printful/Printify |
| Extras | Also export SVG with text converted to outlines (for a local print shop) | Recommendation |

## Avatar export sizes

| Use | Size | Notes |
|---|---|---|
| Master / Slack / general | 1024 x 1024 PNG | Slack accepts 512-1024 |
| LinkedIn | 400 x 400 PNG | Shown as circle |
| Discord | 512 x 512 PNG | 128 is the minimum; circle |
| Teams | 648 x 648 PNG, under 4 MB | No official spec; square PNG advised |
| In-app / favicon | 256 and 64 px | Roster and wall |
| Vector | SVG | For the poster and shirt |

Offer square and circle-preview toggles; always keep the subject inside the inner 80%.

## Recommended feature set

**Must**
- Original SVG dino library (6-8 species silhouettes mapped to the existing dino list, with a generic fallback) with recolourable parts via CSS variables: one engine shared by avatar and shirt.
- Avatar maker: species, 2-3 palettes plus custom colours, accessories (hat, glasses, bowtie, scarf), background, frame; live preview, randomise, undo/redo, presets. Rationale: this is the headline feature.
- Avatar config saved as JSON per person (not a bitmap), rendered everywhere in place of the photo URL. Rationale: tiny storage, always re-editable.
- PNG export at the sizes in the table, plus SVG. Rationale: the point is using it in Slack/Teams.
- T-shirt designer: dino or avatar, name and team text (curated fonts), colour picker, shirt-colour preview, print-ready PNG per the spec table. Rationale: second headline feature.
- Safe photo upload handling (size cap, type check, re-encode, strip EXIF). Rationale: cheap and required once files are stored.

**Should**
- Quiz upgrade: trait breakdown bars, named result card, "apply this dino to my avatar" button. Rationale: connects quiz to the new editor.
- Shareable result card, downloaded as an image. Rationale: the cheapest sharing mechanic.
- Team wall/poster view, printable as A3 with the browser print stylesheet. Rationale: matches the offsite and office-wall use case.
- Dino compatibility between two people from existing trait data. Rationale: gives people something to talk about.
- Keyboard and reduced-motion support, contrast checks on palettes. Rationale: cheap if built in from day one.

**Could**
- Team composition stats panel (diet/mobility mix). Rationale: tiny and fun.
- Printable name cards / place cards (A4 sheet of cards). Rationale: reuses the avatar and wall layout.
- Short "how to work with me" field on the profile card. Rationale: adds real team value.
- Badges (e.g. "Apex predator", "Last to finish the quiz"). Rationale: light gamification, only if time allows.
- Team-wide matching shirt: same design with each person's dino and name. Rationale: the real offsite use case.

## Things to avoid
- Rasterising too early: keep the avatar as a recipe/SVG and render at export size, or shirts will print soft.
- Glows, blurs, drop shadows, gradients with transparency in shirt art (underbase halos on dark shirts).
- Leaderboards or rankings of people; keep it playful rather than competitive.
- Pretending the quiz is scientific; label it for fun and keep it short.
- Trusting uploaded file names, extensions or Content-Type; never serve user files with script-capable types.
- Scope creep into payments, accounts, print-shop APIs or animated avatars; none fit a week and a single team.
