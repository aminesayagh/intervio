# Notice: points to come back to

Points left open on purpose, each with what a person notices today and what it waits for. When one is done, remove it from this file. (Points 1 and 2, record actions served globally, were built on 2026-11-23: spec 8.3.)

## From step 12 (drilling into linked records, 2026-11-23)

Two terms used below:

- **A list's own records and linked records.** On the Items page, the items in the table are its own records. A part opened in that page's panel, from a section of Item 001, is a linked record: it belongs to the Parts collection, which is not on screen.
- **Context.** What a collection lives inside, passed to every data request (spec 4). For example, the intervention whose Resources tab lists its resources.

### 3. A section passes no context to its collection

- **Today:** nothing shows in the showcase (items and parts need no context).
- **Why it matters later:** an intervention's resource panel with a section "Requests it served" must ask for that intervention's requests, so the Requests collection needs the intervention as its context.
- **Next:** a `context: (record, context) => …` on the section, shaped on the first real case (step 13).

### 4. A record with its own page opens in the panel

- **Today:** every linked record opens in the panel. Decision 137 (screen 51) says a record people work inside, such as an intervention, opens its page instead.
- **Why:** the definition needs to say "this record has its own page at this address" (`opensAsPage`), and the first collection that needs it, interventions, is not on the collection component yet.
- **Next:** add `opensAsPage` with the interventions collection.

### 5. Below 1024 px, no way up one level of strips

- **Today:** on a narrow window the strips are hidden (decision 128), and only the browser's Back goes up a level.
- **Why:** decision 128 says "‹" goes up one level there, but no wireframe shows where that "‹" sits (beside the page title, in the top bar…).
- **Next:** decide its place on the wireframes, then build it.

## From the shared record actions (2026-11-23)

### 7. A section moves a changed linked record at once

- **Today:** a part changed from an item's panel moves at once to its new place in that item's Parts section (when the change touches its sort), where a list on screen would keep it in place (decision 136).
- **Why:** a section shows only its first five records and has no "Sort now"; keep-place was left to lists.
- **Next:** decide whether a section keeps a changed record in place too (and how it is sorted again), then build it with `useRecordChanges`, as the list does.

## From moving the address to nuqs (2026-11-23)

### 8. Pages are still matched by hand

- **Today:** `app/App.tsx` finds the page for an address in its own tables (exact paths, then prefixes such as `/interventions/`), and `services/navigation/router.ts` pushes entries and follows the path. nuqs now handles the query string, but it doesn't match paths.
- **Why:** matching paths, path parameters (`/interventions/{id}`), nested layouts and redirects is a router's job (TanStack Router or React Router), and nuqs has an adapter for both.
- **Next:** decide whether to move the pages to a routing library, and which one; the collection's history marks (`history.state`) must survive the move.

## From the performance review (2026-11-23)

### 9. Opening a record: what is left

- **Today:** after the table work and the light panel of 2026-11-23, measured in a production build on this machine (medians; runs vary by up to 100 ms): opening a record shows its content after about 160–180 ms (it was 490 at the start of the day), opening a linked record about 180 ms (was 280), closing about 150 ms, the next record (↓) about 90 ms. The first frame now comes after about 100 ms, since the whole panel is built in the first render.
- **Why the rest:** in that first render, the panel's shell and slide-in, the title's field, the picture and files fields (each about 7 ms in development), the link fields (website, email, phone, location), the description and notes.
- **Next, if needed:** let the link, picture and files fields sleep too (as dates and numbers do now); measure on a faster machine to know how much of the rest is this one.
