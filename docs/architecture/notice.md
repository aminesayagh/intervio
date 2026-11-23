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

### 9. Opening a record shows its content after about 360 ms

- **Today:** after the table work of 2026-11-23 (fixed column widths, the table no longer rendering when the open record changes; spec 8, 9), measured in a production build on this machine, before → after: opening a record 490 → 362 ms until its content shows (main thread blocked 225 → 62 ms; the panel itself starts sliding in after about 60 ms), closing 211 → 129 ms (blocked 260 → 67 ms), archiving 333 → 260 ms (blocked 473 → 165 ms). Next record (↓) about 100 ms, sort about 125 ms, select a row about 70 ms: unchanged.
- **Why the rest:** the table is out of it now. Opening a record waits for the panel's own content: React renders it in small slices while the panel slides in (its values come one render after it opens), about 300 ms of JavaScript for the date pickers, number fields, the description and the sections.
- **Next:** make the panel's content lighter, as the table's cells are: values shown as text, their editors mounted when the person reaches them; then measure again on a production build, and on a faster machine to know how much is this one.
