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
