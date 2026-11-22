# Intervio

Code: `backend/` (Spring Boot, Maven, Java 17) and `frontend/` (React, Vite, pnpm), set up as described in `docs/setup/Intervio-technical-specification.md`; how to run them is in `README.md`.

The current documents are in `docs/architecture/`; the schema and wireframes are on `docs/Intervio.excalidraw`, previewed with `npx -y mcp-excalidraw-server` at http://127.0.0.1:3000.

| File | Holds |
|---|---|
| `use-cases.md` | Decisions, use cases, lifecycles, attributes |
| `glossary.md` | Business terms used everywhere, including on screens |
| `delivery-order.md` | Table dependency levels and the order of feature slices |
| `deferred-features.md` | Features kept out of the core for later |
| `authentication-spec.md` | Build specification for authentication: only what was decided, plus open points |
| `collection-archetype-spec.md` | Build specification for the list-and-record-panel wrapper every collection screen uses |

Keep only the latest version of each document: update it in place, do not create `-v2` copies.

## Coding rules

- **Public identifiers are UUID v7.** Every entity served outside the backend (API responses, URLs, ids sent by the frontend) is identified by its `uuid` column, generated as UUID v7 (`@UuidGenerator(algorithm = UuidVersion7Strategy.class)`). The integer `id` is internal only: never in a response, a URL or a request. Secrets (email-link tokens) and storage keys stay random, not v7.
- **No user-facing text from the backend.** Errors are sent as `{"code": "ERROR_..."}` (upper case, `ERROR_` prefix, for example `ERROR_AUTH_FAIL`). The frontend maps each key to the translated message (English and French). Emails are the only text the backend writes.
- **Changing views go through the ui-kit's animated components, never `cond && <X/>` or a ternary in JSX:** `Show` for one condition (with `fallback` for an else), `Switch` + `Match` for if / else if / else, `Variant` for one view per option of a value. They share one short fade, and none with reduced motion. The exception is where a wrapper element would be invalid HTML (rows directly in `<tbody>`, items directly in `<ol>`/`<ul>`): put the `Show` inside the row or item.
- **A field's error shows with `FieldError`** (or `ErrorText` inside a status line), so every editable value reports a refused or failed change the same way.

## Visual identity (the built app)

- Colors and font are the tokens in `frontend/src/services/ui-kit/theme.css` (primary #f4c542, background #f2f1ec, text #252522, font Manrope). HeroUI's variables point to these tokens; change the tokens, never HeroUI's values directly.
- Corners are small and never fully rounded: buttons share the fields' radius (`--field-radius`).
- Compact interface to show more information: 14 px base (`html { font-size: 87.5% }`), page text at the label size (`text-sm`), tight spacing.
- Main action buttons (`.button--primary`) have a soft shadow in the primary color; fields have only a faint one.
- Every text field shows a placeholder: sample name, sample work email, and dots (••••) for passwords.
- **Icons come only from the Intervio set** in `frontend/public/icons/`: use `<Icon name="Eye" />` from `services/ui-kit` (file name without `.svg`). It takes the current text color, so it follows light and dark mode. Multicolor brand icons (such as `google.svg`) are plain `<img>`. Never draw icons inline or add an icon library.
- **Country flags** are images, not icons: SVGs from flag-icons (MIT, licence beside them) copied into `frontend/public/flags/<code>.svg` and shown as a 16 × 12 `<img>` beside the country name.
- The wireframes stay grayscale; this identity applies to the built app only.

## Running app

- The user reviews the app continuously: keep `make dev` running (frontend http://localhost:5173, emails http://localhost:8025). Do not stop it after checks; start it again if it is not running.
- Frontend changes reload by themselves. After backend (Java) changes, restart only the backend so the frontend stays open.

## Versioning

- The code is on GitHub at https://github.com/aminesayagh/intervio (public). Claude owns versioning.
- **One branch per feature or change**, never directly on `main`. Branch names: `feature/<short-name>` for features, `fix/<short-name>` for fixes, `chore/<short-name>` for tooling and docs (for example `feature/onboarding`).
- Commit with clear messages on the branch, push it, and open a pull request into `main`. CI (GitHub Actions, `.github/workflows/ci.yml`) runs on the pull request; merge only when its jobs are green, then delete the branch. Review apps installed on the repository (Sourcery, Socket) do not block a merge.
- Before each commit, check that no secrets, `.env` files or personal data are included.

## Wireframing rules (always apply)

### Drawing style
- **Grayscale only.** Black, white and grays. No color, even for states.
- **Square corners.** No rounded corners on any shape (Excalidraw `roundness: null`).
- **Clean lines.** Architect style, not hand-drawn (`roughness: 0`), stroke width 1.
- **One font.** A single sans-serif font for all text (Excalidraw "Normal", `fontFamily: 2`). Sizes: 28 page title, 20 section title, 16 body and labels, 14 helper text.
- **No unneeded boxes.** Draw a shape only when the real interface has one (input, button, card, table). No decorative containers.
- **Aligned corners.** Every element snaps to the page grid. Edges that should line up share the same x or y exactly.

### Page frame and grid
- **Browser size:** each screen is a 1440 × 900 frame showing only the page content, with no browser bar.
- **Grid:** 12 columns, 72 px side margins, 24 px gutters: columns are 86 px, content area 1296 px.
- **Spacing unit:** 8 px. All gaps and sizes are multiples of 8.
- **Visible grid:** the 12 columns are drawn as very light gray bands on a locked layer behind each screen.
- **Header:** every public screen (accounts, onboarding) starts with a 64 px header: the logo ("Intervio", size 20) on the left at the margin, and on the right the language switcher (EN / FR, size 14, active language in black) and the light and dark mode switch (a half-filled circle).
- **Signed-in screens:** full width, no centered content area. A 264 px sidebar on the left (16 px inner padding, light gray right border) replaces the header. The body grid has 12 columns of 72 px, 24 px gutters and 24 px margins.
- **Rows by flow:** inside an area, each row holds one use case or flow (for example the empty states, on the list and on the record), with the row's title (size 20) and a thin light gray line above its screens; screen titles are labels (size 16). A row holds up to 8 screens and wraps onto a second line only beyond 8. Screens are numbered in reading order.
- **Areas on the board:** once an area is finished, its screens are grouped in one box with the area's title (size 28) at the top left, 80 px padding, and a single Excalidraw group so the area moves as one. Screens are numbered in sequence across areas.

### Text on screens
- **Minimal.** Only what the user needs to complete the next step: titles, labels, buttons, short helper or error text.
- **Formally correct.** Correct sentences and punctuation, a professional tone suited to maintenance clients and contractors.
- **Business words only.** Use the user-facing terms from the glossary.
- **No specification on the drawing.** No status codes, table names, rules or notes about how the system works. Explanations stay in the md files.

### Way of working
- **Ask before deciding.** Anything the use cases do not define is raised as an open question with a proposal; the user decides, and the decision is added to the decisions section of `use-cases.md`.
- **One area at a time,** following `delivery-order.md`. First area: account management (log in, sign up, forgot password).
