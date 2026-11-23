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

### 9. Archiving a record is the slowest action left

- **Today:** at the end of 2026-11-23 (production build, this machine, medians): opening a record shows its content after about 120 ms (first frame about 75 ms; it was 490 ms in the morning), the next record about 70 ms, closing about 130 ms, a linked record about 155 ms, sorting about 160 ms, selecting a row about 100 ms. Archiving, from the confirmation to the panel closed, takes about 260–300 ms (main thread blocked about 200 ms).
- **Why:** not looked into yet. It closes the confirmation dialog and the panel, takes the row out of the table (which renders it again), and shows the message with Undo, in the same moment.
- **Next:** trace it as opening was traced, and see which of these costs most.
