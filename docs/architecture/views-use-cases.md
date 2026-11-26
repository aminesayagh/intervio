# Views: use cases

Status: scope decided (2026-11-26, decision 166). The first version has only **configured views**: each collection's views are set in the frontend's code, the same for everyone. Section 2 lists what that version covers; the other use cases stay here for later (`deferred-features.md`, "Views people create and share").

## 1. What a view is

A **view** is a saved way of looking at one collection's records: a **type** (a table today; a kanban, a calendar or others later) with its own settings (filters, sort, columns, grouping). A collection can have many views; several views can have the same type ("Open documents" and "My equipment" are two tables of the resources). A view only changes what is shown and in which order: it never gives access to a record the person can't see, and never changes a record.

| Term         | Meaning                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **View**     | A named presentation of one collection: type + settings (+ who it belongs to, for views people create later)               |
| **Type**     | How the records are drawn: table, kanban, calendar… A type is a component; a view is its configuration                     |
| **Settings** | What the view keeps: filters, sort, columns (shown, order, width), the kanban's grouping field, the calendar's date field… |
| **Owner**    | The person who created the view                                                                                            |
| **Audience** | Who sees a view: only its owner, or the people it is shared with                                                           |

On narrow screens a table view is drawn as rows (the rows, collection spec 5.2): the same view, not another one.

## 2. First version: configured views

- **Views come from the collection's definition** in the frontend (name, type, filters, sort, columns), next to its fields. No backend, no table, no API.
- **Covered:** V1 (see the views), V2 (switch), V3 (open on the last-used view, remembered by the browser, else the first configured one), V4 (`?view={key}` in the address, a stable key from the config instead of an id), V9 (filter, sort and search inside a view, as today, kept in the address and not saved).
- **Not in this version:** creating, saving, organizing and sharing views (V6-V8, V10-V23), views on every device (V5), and keeping views valid (V24-V27): a view is code, so TypeScript checks its fields.
- **Where they appear (Q1, decision 169):** a button beside the collection's title shows the view on screen (its type's icon and name); with several views it opens a menu that lists them under a search field. With one view, only its name shows. There is no "Add view": the app configures the views. The active view is in the address (`?view={id}`).
- **Every collection has at least one view.** Without configured views, it gets the default view: a table with every column, no filters and no default sort beyond the collection's own.

### What the app configures for a view (decision 168)

- **C1. Its id**, set by the app: used in the address (`?view={id}`) and to remember the last view used. Never shown.
- **C2. Its name**, a translation key or plain text (the app may give the same value as the id).
- **C3. Its order** among the collection's views (optional; otherwise the order of the configuration). The first view is the default one.
- **C4. Its type**: `table` or `kanban`, each with its own settings and defaults:
  - table: the columns shown, in their order (default: all of them);
  - kanban: the select field that makes the columns (`groupBy`, required) and the fields each card shows (default: the name only).
- **C5. Its filters and sort**, both optional.
- **C6. Whether the person may change its filters** (default: yes). When not, the view's filters always apply and the filter menu is off; the search stays.
- **C7. Whether the person may change its sort** (default: yes). When not, the sort menu is off.
- **C8. An unknown view** (an old link, a view removed from the configuration) opens the default view.
- **C9. New records follow the view**: a record created in a filtered view, or in a kanban column, takes the view's (or the column's) value, so it stays in sight.
- **Not configured:** views per person (every person sees every view; who may open the collection is decided outside it), and filters that depend on the person ("My items"): no saved per-person filter exists yet.

### The kanban type

- **K1. See the board.** One column per option of a select field (`groupBy`, such as Status), in the options' order, each with its count. A card shows the record's name and the fields the view lists.
- **K2. Each column loads on its own (decision 167).** A column asks for the view's query plus its own value, and loads more as it scrolls, so counts and paging are right per column.
- **K3. Open a card.** Clicking a card opens the record in the panel, as a table row does.
- **K4. Move a card.** Dragging a card to another column changes its value through the normal save (undo, notifications, the server's check); the keyboard does it too (React Aria's drag and drop, through `ui-kit/aria`). A card the person can't edit can't be moved.
- **K5. Narrow screens (decision 167).** Columns sit side by side, one screen wide, swiped sideways; a card moves through its menu instead of dragging.
- **Not in the first kanban:** selecting cards and bulk actions, ordering cards by hand inside a column, grouping by something other than a select field.

## 3. Actors

- **Client** (the account that owns the company) and **colleagues** (client staff, glossary): the people who use collections on the client side.
- **Bidders / contractors**, wherever a collection is shown to them (later).
- **The system**: creates the default view of each collection, and keeps views valid when the collection changes.

## 4. Use cases

### A. Seeing and switching views

**V1. See the views of a collection.** Above the list, the person sees the views they can use: their own, those shared with them, and the default one. One is active; its name shows.

**V2. Switch to another view.** Choosing a view shows the records with its type and settings at once. The open record (the panel) stays open if it is still in the list.

**V3. Open a collection on the right view.** Opening a collection shows the view the person used last on it; the first time, the collection's default view.

**V4. Open a view from a link.** A shared address opens the collection on that view (`?view={id}`), as long as the person may see the view; otherwise the default view, with a notification.

**V5. Same views on every device.** A person's views and their last-used view come from the server, so they follow them from one browser to another.

### B. Creating views

**V6. Create a view.** "+ New view" asks for a name and a type (table only, until another exists). It starts from the default view's settings, or from what is on screen ("Save as new view").

**V7. Duplicate a view.** Makes a copy with "(copy)" after its name, owned by the person duplicating, private until shared.

**V8. Several views of the same type.** Nothing limits how many tables (or later kanbans) a collection has; each keeps its own settings.

### C. Changing a view's settings

**V9. Filter, sort, search in a view.** The filter and sort menus work as today, inside the active view. Search stays a passing action, not kept by the view (open question Q3).

**V10. Choose and arrange columns (table).** Show or hide a column, reorder columns, change their width; the name column stays first.

**V11. Settings of each type (later types).** A kanban chooses its grouping field (a select, such as Status) and the order of its columns; a calendar chooses its date field. The settings of one type don't affect another.

**V12. See that a view has unsaved changes.** Changing a filter, the sort or the columns marks the view as changed ("Edited"), with **Save** and **Reset**. Reset brings back the saved settings.

**V13. Save the changes.** Save writes the settings to the view, for everyone who sees it. Only someone allowed to edit the view can save (V20); anyone else gets "Save as new view" instead.

**V14. Keep changes without saving.** Unsaved changes stay while the person works and after a refresh, in the address (as today's filters and sort); leaving the view and coming back shows its saved settings.

### D. Organizing views

**V15. Rename a view.**

**V16. Reorder views.** The person orders the views they see; the order is theirs, not shared.

**V17. Delete a view.** After a confirmation. A shared view deleted by its owner disappears for everyone; whoever was on it lands on the default view.

**V18. Choose my default view of a collection.** The view a collection opens on for this person (V3), instead of the one used last.

### E. Sharing

**V19. Share a view.** The owner chooses its audience: only me (private), the company's colleagues, or a group of people (an intervention's team, when the collection lives inside an intervention). Sharing never shows a record to someone without the right to see it: each person sees, through the view, only the records their rights allow.

**V20. Who may change a shared view.** The owner always; the audience can use it, and change it only if the owner allows it ("Can edit"). Everyone else can duplicate it to make their own.

**V21. Stop sharing.** The view becomes private again; the people who were on it land on their default view.

**V22. Pin a view to the profile.** A person keeps a view on their profile (the sidebar's favorites, for example) to reach it from anywhere in the app.

**V23. A company's standard views.** The client sets views every colleague gets (such as "Due this week"), and may make one the collection's default for everyone.

### F. Keeping views valid

**V24. A field disappears or changes type.** A filter, sort or column on a field that no longer exists is dropped from the view when it opens, and the view says so once; the rest still works.

**V25. A view's owner leaves.** Their private views are deleted with the account; their shared views stay, owned by the client (open question Q8).

**V26. A view nobody may see any more.** A link to a deleted or unshared view opens the default view, with a notification (V4).

**V27. A new collection.** Every collection comes with one default view: a table of every record, in the collection's default sort, which can't be deleted.

## 5. What views change in today's behavior

- Today the filters and sort live in the address, and the last sort is remembered by the browser (collection spec 6). With views, the saved filters, sort and columns live in the view, on the server; the address still carries unsaved changes (decision 112), so a shared link shows what its sender sees.
- Choosing, reordering and resizing columns, and saved views, were left out of the collection's first build (collection spec 1, "Out of scope"); views bring them in.
- The collection's `views/` folder holds the types of view (table, rows, later kanban) and, from MOH-31, the configured views. "Layout" stays the word for how the screen is split (`layout/`: modes, the panel's width).

## 6. Open questions (each with a proposal)

**Q1. Where do views appear?** Proposal: tabs above the toolbar, one per view, with "+" at the end and a ⋯ menu per view (rename, duplicate, share, delete); extra views fold into a "More views" menu when the row is full.

**Q2. Save explicitly or automatically?** Proposal: explicitly (V12-V13), so a shared view never changes under its audience by accident; a private view could save automatically instead.

**Q3. Does a view keep the search?** Proposal: no; search is a passing action. Filters cover lasting needs.

**Q4. Who can share with the whole company?** Proposal: the client and any colleague; only the client sets the company's standard views and the collection's default (V23).

**Q5. What is a "team" for sharing?** Today a team is the colleagues of one intervention (decision 96). Proposal: sharing offers "Company" (every colleague) and, for a collection inside an intervention, "This intervention's team"; named groups of people are deferred.

**Q6. Do contractors get views?** Proposal: later; the model allows it (a view's audience is people), but the first version is for the client side.

**Q7. Is a view tied to a context?** A collection inside an intervention (its resources) shows the same views in every intervention, or each intervention has its own? Proposal: the same views across interventions (a view is "my way of looking at resources"), with sharing to one intervention's team as the exception.

**Q8. What happens to a leaving owner's shared views?** Proposal: they pass to the client, who can delete them.

**Q9. Limits.** Proposal: none at first; revisit if people create hundreds.

## 7. Out of scope here

- The backend model and API (a `views` table: collection key, owner, audience, type, settings as JSON, position): designed once these use cases are agreed.
- The kanban and calendar types themselves (Linear issues of their own).
- The collection's code contract for types of view (MOH-21, built: `ViewProps` in `views/viewProps.ts`).
