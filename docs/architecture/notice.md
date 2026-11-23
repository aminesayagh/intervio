# Notice: points to come back to

Points left open on purpose, each with what a person notices today and what it waits for. When one is done, remove it from this file.

## From step 12 (drilling into linked records, 2026-11-23)

Two terms used below:

- **A list's own records and linked records.** On the Items page, the items in the table are its own records. A part opened in that page's panel, from a section of Item 001, is a linked record: it belongs to the Parts collection, which is not on screen.
- **Context.** What a collection lives inside, passed to every data request (spec 4). For example, the intervention whose Resources tab lists its resources.

### 1. A linked record of another collection has no More actions

- **Today:** a part opened from an item's panel shows no "⋯" menu, so it can't be archived or removed there. Its values can be edited.
- **Why:** archiving and removing (confirmation, message with Retry, leaving the lists, closing the panel) live inside the collection screen that owns the record. That screen is not mounted when the record is opened from another collection.
- **Next:** serve record actions from one shared layer, so any component can run them and every screen stays in sync. See "Proposal for point 1" below.

### 2. A linked record's changed value doesn't keep its place

- **Today:** decision 136 (a changed record keeps its place until "Sort now") applies only to a list's own records. A part changed from an item's panel is saved and every Parts list reloads, so a sorted Parts list shows it at its new place at once.
- **Why:** keeping the place belongs to the list on screen, and that list is not the one showing the linked record.
- **Next:** solved with point 1: the list listens to changes made anywhere and holds its order the same way.

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

## Proposal for point 1: record actions served globally

**The problem.** Every change to a record is written inside the collection screen: saving a value (with keep-place and the 403/404 cases), creating, archiving, removing, the same on several selected records, and their messages and confirmations. A component outside that screen (a linked record's panel, a dashboard card, a full page reached from elsewhere) can't run them, and nothing tells the other screens a record changed.

**The idea.** The data already lives in one global place: TanStack Query's cache, where every list and record of a collection is stored under its key. So the actions move next to that cache, one layer shared by every component, and the screens keep only what is really theirs (which record is open, what is selected, the order they hold).

**The toolkit:**

1. **`useRecordActions(definition, context)`, the one way to change a record.**
   - Returns `save(record, patch, field)`, `create(values)`, `archive(record)`, `remove(record)`, `restore(id)`, and the same for several records.
   - Each one calls the collection's data source, updates every cached list and record of that collection (the `cache` helpers), handles a refusal the same way everywhere (403: rights reloaded; 404: the record leaves), and posts the message with Retry or Undo.
   - It works without the collection screen being mounted: a part's panel on the Items page calls the Parts collection's actions.
2. **Record changes, announced to whoever listens.**
   - Each action announces what happened: `{ collection key, id, updated | created | removed }`.
   - Screens subscribe for their own reactions: a list keeps a changed record in place (point 2) and drops a removed one from its selection; a panel or a page showing a removed record closes or says it is no longer available.
   - Why not only the cache: the cache says data changed, not that a person archived a record, which is what a panel needs to close.
3. **`confirm({ title, text, button })`, a confirmation anyone can ask for.**
   - Returns a promise (confirmed or not), shown by one `<Confirmations />` host at the app's root, as `<Notifications />` is for messages.
   - So the confirmation shows even when the screen that would have drawn it is not mounted.
4. **`allowedActions(definition, record, context)`, the rights in one place.** The menu, the toolbar's bulk actions and the panel ask the same function.

**Example.** On the Items page, a part opened from Item 001 → "⋯" → Archive → `confirm()` → the Parts actions archive it → every cached Parts list loses it, including Item 001's Parts section, which reads the same cache → the event tells the panel showing it to go back one step → one message, with Retry if it failed.

**Trade-offs.**

- The collection screen loses about 300 lines to the shared layer. The existing tests (184) stay as the guard that nothing changed for a list's own records.
- Changes still wait for the server before showing (no optimistic update), as today: a wrong optimistic state would need undoing, and the server answers fast enough.
- Open question: should Archive offer Undo (restore) in its message, like "Record created" does? Decision 132 doesn't say.
