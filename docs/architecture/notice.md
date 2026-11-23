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

### 6. Stepping back from a linked record redraws the whole table

- **Today:** closing a linked record (×, a tab, Back, or archiving it) makes every row and cell of the list draw again (React Scan shows it).
- **Why:** each record tab before the panel takes 32 px from the list (`tabsWidth`); when the last tab leaves, the list is wider, so the columns that fit change and the table is rebuilt. It comes from step 12, not from the record actions.
- **Next:** keep the list's width the same while tabs come and go (the tabs take their room from the panel, or the columns are worked out without them), then check with React Scan that only the panel draws again.

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

### 9. Opening and closing a record are over the 100 ms budget

- **Today:** measured in a production build of the showcase (`VITE_SHOWCASE=1`, this WSL machine, median of 5): opening a record about 600 ms, closing about 250 ms, archiving about 330 ms, sorting about 215 ms, the next record (↓) about 140 ms, selecting a row about 90 ms. The same within noise on `main` (before step 12), at the end of step 12, and after the record actions and nuqs: these changes cost nothing, and the gap was already there.
- **Why:** opening or closing the panel changes the table's width. React Aria's virtualized table watches its size and, on a change, draws every visible row again in one synchronous render (`flushSync` in its `ScrollView`, about 200 ms), then the columns that fit change and render again. Each row is costly because it mounts React Aria's checkbox, buttons and focus handling, not because of one slow component of ours.
- **Next, to decide:** (a) keep the table's width while the panel opens and closes (the panel covers the list's right side, the columns change once when it settles), which changes how it looks; (b) make rows lighter (the selection checkbox and the cell buttons asleep until the row is reached, as the editors already are); (c) merge the resize render and the column change into one. Measure each on a production build before keeping it, and on a faster machine to know how much is this one.
