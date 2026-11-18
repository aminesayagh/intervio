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

Keep only the latest version of each document: update it in place, do not create `-v2` copies.

## Coding rules

- **No user-facing text from the backend.** Errors are sent as `{"code": "ERROR_..."}` (upper case, `ERROR_` prefix, for example `ERROR_AUTH_FAIL`). The frontend maps each key to the translated message (English and French). Emails are the only text the backend writes.

## Versioning

- The code is on GitHub at https://github.com/aminesayagh/intervio (public). Claude owns versioning: after each finished piece of work (a feature, a doc update, a board change), commit with a clear message and push to `origin main`.
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
- **Header:** every public screen (accounts, onboarding) starts with a 64 px header: the logo ("Intervio", size 20) on the left at the margin, and on the right the language switcher (EN / FR, size 14, active language in black) and the light and dark mode switch (a half-filled circle). A light gray line closes the header.
- **Signed-in screens:** full width, no centered content area. A 264 px sidebar on the left (16 px inner padding, light gray right border) replaces the header. The body grid has 12 columns of 72 px, 24 px gutters and 24 px margins.
- **Areas on the board:** once an area is finished, its screens are grouped in one box with the area's title (size 28) at the top left, 80 px padding, and a single Excalidraw group so the area moves as one. Screens are numbered in sequence across areas.

### Text on screens
- **Minimal.** Only what the user needs to complete the next step: titles, labels, buttons, short helper or error text.
- **Formally correct.** Correct sentences and punctuation, a professional tone suited to maintenance clients and contractors.
- **Business words only.** Use the user-facing terms from the glossary.
- **No specification on the drawing.** No status codes, table names, rules or notes about how the system works. Explanations stay in the md files.

### Way of working
- **Ask before deciding.** Anything the use cases do not define is raised as an open question with a proposal; the user decides, and the decision is added to the decisions section of `use-cases.md`.
- **One area at a time,** following `delivery-order.md`. First area: account management (log in, sign up, forgot password).
