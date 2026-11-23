# Notice: points to come back to

Points left open on purpose, each with what a person notices today and what it waits for. When one is done, remove it from this file. (Points 1 and 2, record actions served globally, were built on 2026-11-23: spec 8.3. Point 8, pages matched by hand, was built on 2026-11-23 with React Router: spec 6.3. Point 3, context for records opened from a section and "Show all", was built on 2026-11-23: decision 145.)

## From the performance review (2026-11-23)

### 9. Archiving a record takes about 200–240 ms (accepted)

- **Today:** after the table's controls started waiting for their row (2026-11-23), archiving takes about 200–240 ms from the confirmation to the panel closed (it was about 260–290), with the main thread blocked about 130–170 ms (was about 200–230); sorting about 100–120 ms (was about 150).
- **Why the rest (traced):** taking the row out moves every row after it, and React Aria's table draws each moved row again (its own row and cell wrappers, about 60 ms; that part only changes inside React Aria); then the panel closes, the table widens, and the columns that come back into view are drawn (about 95 ms). Closing the panel first and taking the row out after was tried and measured: it doesn't help (the same work, in another order, and the panel closes later).
- **Decided (2026-11-23): accepted as it is.** Archiving may take this long; no further work unless a clear, cheap solution appears. The idea left: keep the columns hidden behind the panel drawn while it is open (so closing it draws nothing new), against drawing more cells all the time.
