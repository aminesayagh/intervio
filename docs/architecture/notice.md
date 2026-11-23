# Notice: points to come back to

Points left open on purpose, each with what a person notices today and what it waits for. When one is done, remove it from this file. (Points 1 and 2, record actions served globally, were built on 2026-11-23: spec 8.3. Point 8, pages matched by hand, was built on 2026-11-23 with React Router: spec 6.3.)

## From step 12 (drilling into linked records, 2026-11-23)

Two terms used below:

- **A list's own records and linked records.** On the Items page, the items in the table are its own records. A part opened in that page's panel, from a section of Item 001, is a linked record: it belongs to the Parts collection, which is not on screen.
- **Context.** What a collection lives inside, passed to every data request (spec 4). For example, the intervention whose Resources tab lists its resources.

### 3. A record opened from a section, and "Show all", get no context

- **Today:** a section can give its linked collection a context (`SectionDefinition.context`, built 2026-11-23), and the section's list asks for its records with it. But a record opened from that section in the panel, and the list "Show all" opens, get no context: the address keeps only the linked collection's key and the record's id.
- **Why it matters later:** an intervention's resource panel with a section "Requests it served": opening one of those requests, or showing them all, must still ask within that intervention.
- **Next:** decide how the context travels in the address (for example the parent's id, which the linked collection turns back into its context), shaped on the first real case.

## From the performance review (2026-11-23)

### 9. Archiving a record takes about 200–240 ms (accepted)

- **Today:** after the table's controls started waiting for their row (2026-11-23), archiving takes about 200–240 ms from the confirmation to the panel closed (it was about 260–290), with the main thread blocked about 130–170 ms (was about 200–230); sorting about 100–120 ms (was about 150).
- **Why the rest (traced):** taking the row out moves every row after it, and React Aria's table draws each moved row again (its own row and cell wrappers, about 60 ms; that part only changes inside React Aria); then the panel closes, the table widens, and the columns that come back into view are drawn (about 95 ms). Closing the panel first and taking the row out after was tried and measured: it doesn't help (the same work, in another order, and the panel closes later).
- **Decided (2026-11-23): accepted as it is.** Archiving may take this long; no further work unless a clear, cheap solution appears. The idea left: keep the columns hidden behind the panel drawn while it is open (so closing it draws nothing new), against drawing more cells all the time.
