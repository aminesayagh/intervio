# Intervio — collection archetype specification

**Date:** 2026-11-21  
**Purpose:** Everything decided for the list-and-record-panel archetype, so it can be built once as a generic wrapper and reused by every collection screen.  
**Frontend:** React 19, TanStack Query 5, TanStack Table 9, TanStack Virtual 3, HeroUI 3, Motion, i18next, the app's History-API router (`services/navigation`). Libraries and their roles: section 5.1.  
**Sources:** decisions 109–131 in `use-cases.md`; screens 27–56 on `docs/Intervio.excalidraw` (area "List and record panel").

Anything not written here is **not decided**. Open points are listed in section 16.

## 1. Scope

**In scope**

- One generic wrapper, `Collection`, that knows nothing about the records it shows. A collection plugs in through a definition (section 4).
- The list: header, toolbar (search, filters, view switch), cards or table, infinite scroll.
- The record panel: view, edit in place, linked records, more actions, loading and unavailable states.
- Creating a record in the panel.
- The full page of a record, and collections nested in a record page.
- Remembering the screen across a refresh, the Back button and shared links.
- Layout by screen width, keyboard, accessibility.
- How a collection reaches its data: a default REST adapter whose routes and parameters can be overridden, or callbacks (section 11).
- How the archetype is tested (section 15).

**Out of scope (not decided, not built)**

- Selecting several records and acting on them at once.
- Choosing, reordering or resizing columns; saved views.
- Live updates pushed by the server.
- Favorites, sharing and the activity feed themselves. The panel has their places; each feature fills them when it is built.

## 2. Words used here

| Word | Meaning |
|---|---|
| **Collection** | A set of records of one kind shown on one screen: the company's resources, an intervention's resources, requests… |
| **Record** | One item of a collection. Its public identifier is its UUID v7. |
| **List** | The left side: the records as cards or as a table. |
| **Panel** | The right side, 560 px wide by default and resizable: one record, or a new one. |
| **Full page** | One record shown as the main view ("Open full page"). |
| **Context** | The record a collection lives in, when there is one. For example, the intervention whose Resources tab is open. |
| **Definition** | The object a collection gives to `Collection`: how to fetch, show, filter, sort, create and edit its records. |

## 3. Behavior summary

| Topic | Rule | Decision |
|---|---|---|
| What opens where | Records people look at open in the panel; records people work inside (intervention, later offer) open their own page | 109 |
| List structure | Header (title, main action) · toolbar (search, filters, Cards / Table) · records · loading row | 110 |
| Loading more | **Infinite scroll**, no page numbers. The header shows the total ("42 records") | 110 |
| Panel position | Beside the list, never over it; the list stays usable; the open record is marked | 111 |
| Addresses | Every state that matters is in the address: search, filters, sort, open record, creation | 112 |
| Refresh | A refresh brings back the same screen: list state, open record, panel history, scroll position, unsaved creation | 126 |
| Keyboard | ↑ / ↓ move between records with the panel open, Enter opens, Escape closes | 113 |
| Panel structure | Top bar · title · added-by line · properties · sections · activity | 114 |
| Linked records | One panel at a time, with a Back link; records with their own page open that page | 115 |
| Editing | In place: text → field with Cancel and Save; set choices → menu that saves at once | 116 |
| More actions | Open full page, Copy link · Archive, Remove (with confirmation) | 117 |
| Creating | "+ Add" opens the record view with defaults; it is created automatically once its required fields are filled; Undo for 5 s | 125 |
| Modals | Only for confirmations: discarding input, removing | 125 |
| Widths | ≥ 1440 side by side · 1024–1439 sidebar folds while the panel is open · < 1024 the panel is a page | 121, 124 |
| Drilling into linked records | "Show all {n}" opens them as the main list, filtered to the parent; the previous view folds into a 32 px strip | 127, 128 |

## 4. The definition: how a collection plugs in

`Collection` is configured by one typed object. Everything specific to a kind of record lives in the definition; everything else is the wrapper's job.

```ts
type Id = string // UUID v7

type Page<T> = { items: T[]; nextCursor: string | null; total: number }

type ListQuery = {
  search: string
  filters: Record<string, string[]> // filter id → chosen option ids
  sort: { by: string; direction: 'asc' | 'desc' }
  cursor: string | null
}

type CollectionDefinition<T, C = undefined> = {
  key: string                        // 'resources'; names the cache, the storage keys and the addresses
  i18n: { namespace: string; title: string; add: string; empty: { title: string; text: string } }
  getId: (record: T) => Id

  // Data (section 11): a REST adapter with overridable routes, or callbacks
  source: DataSource<T, C>
  create?: {
    defaults: (context: C, filters: ListQuery['filters'], user: CurrentUser) => Partial<T>
    required: string[]                 // property ids that must have a value before the first save
  }
  actions?: ActionDefinition<T, C>[] // archive, remove…; each with its own confirmation

  // List
  filters: FilterDefinition[]
  sorts: { by: string; label: string }[]
  defaultSort: ListQuery['sort']
  card: (record: T) => CardContent      // type chip, title, detail line, status, avatar
  columns: ColumnDefinition<T>[]        // the full table; a column that shows a property names it, and is edited like it (7.3)
  columnPriority: string[]              // column ids by importance; beside the panel, the table shows those that fit, name first

  // Panel and full page
  panel: {
    type: (record: T) => string                 // the chip in the top bar
    title: (record: T) => string
    subtitle: (record: T) => string             // "Added by … on …"
    properties: PropertyDefinition<T>[]
    description: (record: T) => string          // Markdown (section 7.6)
    sections?: SectionDefinition<T, C>[]        // linked records…
    activity?: boolean
  }
  opensAsPage?: (record: T) => string | null    // a record people work inside: its page address
  rights: (record: T, user: CurrentUser, context: C) => Rights   // section 7.7
}

type Rights = {
  edit: string[]      // ids of what may change: property ids, 'title', 'description'
  add: string[]       // ids of the sections that show "+ Link or add"
  actions: string[]   // ids of the actions allowed (archive, remove…)
}
```

`PropertyDefinition` has an id, a label key, a value getter and a kind: `text`, `longText`, `date`, `select` (with options), `person`, `chip`, `switch` or `custom` (a render function). An editable property also has a `validate` function returning an `ERROR_…` key or nothing.

`SectionDefinition` has a label key, a loader returning the linked records with a count, a renderer for one item, and an optional "+ Link or add" action. Each item opens in the same panel, or its page when `opensAsPage` says so.

`FilterDefinition` has an id, a label key, its options (fixed, or loaded once), and whether several can be chosen.

Usage:

```tsx
<Collection definition={resourcesDefinition} />
<Collection definition={interventionResourcesDefinition} context={{ interventionId }} basePath={`/interventions/${interventionId}/resources`} />
```

## 5. Component structure

### 5.1 Libraries

| Library | Role | Already installed |
|---|---|---|
| **TanStack Query 5** | Loading, caching and refetching: `useInfiniteQuery` for the list, `useQuery` for one record, `useMutation` for create, edit and remove | Yes |
| **TanStack Table 9** (`@tanstack/react-table`) | The table's headless model: columns, header groups, sorting state, column visibility. Built with `useTable({ features, columns, data })` and a stable `tableFeatures({ rowSortingFeature, columnVisibilityFeature })` defined once in the wrapper. Sorting happens on the server: the table's sorting state is controlled from the address, and no sorted row model is registered | To add |
| **TanStack Virtual 3** (`@tanstack/react-virtual`) | Draws only the visible cards or rows, measures them (`measureElement`), triggers the next page, and restores the scroll position after a refresh (`takeSnapshot`, `initialMeasurementsCache`, `initialOffset`) | To add |
| **HeroUI 3** | The visual parts: chips, menus, buttons, fields, dialogs, the table's look. TanStack Table gives the model; the cells are drawn with the app's components | Yes |
| **Motion** | The panel's slide | Yes |
| **react-markdown 10** with **remark-gfm 4** | Shows the description formatted, with GitHub-style lists, check lists and tables; raw HTML is not rendered | To add |

TanStack Table and Virtual are headless: they hold logic, not styles. The look stays the app's (CLAUDE.md, visual identity).

### 5.2 Parts

One public component, `Collection`. Its parts are internal and are not used on their own.

| Part | Responsibility |
|---|---|
| `Collection` | Reads the state (section 6), chooses the layout (section 9), renders the parts below |
| `CollectionHeader` | Title, total, main action |
| `CollectionToolbar` | Search, filter menus with counts, "Clear filters", Cards / Table |
| `CollectionList` | Cards or table; the marked record; the loading row; empty, no-result and error states |
| `RecordPanel` | Top bar, panel history (Back), view or creation; loading and unavailable states |
| `RecordView` | Title, subtitle, properties, description, sections, activity; used by the panel and the full page |
| `MarkdownView` · `MarkdownEditor` | The description shown formatted, and its editor (section 7.6) |
| `PropertyRow` | One property: shows it, or edits it in place (section 7.3) |
| `NewRecord` | The record view before its first save: defaults, "Not saved yet", first save, Undo (section 7.5) |
| `RecordPage` | The full page: breadcrumb, `RecordView` in two columns (decision 120) |

Hooks, each in its own file and tested on its own:

| Hook | Does |
|---|---|
| `useCollectionState` | Reads and writes the address and the stored state (section 6) |
| `useCollectionQuery` | The infinite query and the cache updates, through the collection's data source (sections 8 and 11) |
| `useCollectionList` | The virtualizer, loading more when the last drawn item is near the end, and saving and restoring the scroll position |
| `usePanelHistory` | The panel's Back links |
| `useListKeyboard` | ↑ / ↓ / Enter / Escape (section 10) |
| `useLayoutMode` | `wide`, `medium` or `narrow` from the screen width |
| `useUnsavedGuard` | Asks before discarding a new record that has input but is not saved yet |

## 6. State, addresses and refresh

### 6.1 Where each piece of state lives

| State | Kept in | Why |
|---|---|---|
| Search, filters, sort | Address | A shared link shows the same list |
| Open record | Address: `?open={id}` | A shared link opens the record; Back closes it |
| Creation in progress | Address: `?new` | Back cancels it; a refresh keeps it |
| Panel history (the Back links) | Session storage, per collection | Survives a refresh, not shared |
| Scroll position and number of loaded pages | Session storage, per collection and address | A refresh comes back to the same place |
| Values typed in a creation | Session storage, per collection | A refresh does not lose them |
| View (cards or table), last sort, panel width | Local storage, per collection | A preference of this browser |
| Sidebar folded by a panel (medium width) | Not stored | It follows the panel |

Address format, on the collection's base path:

```
/resources?q=pump&f.type=document,equipment&f.status=valid&sort=updated:desc&open=0192…
/interventions/0192…/resources?open=0193…
/resources?new
```

Filters use one parameter per filter (`f.{id}`), with chosen options separated by commas. Default values are left out of the address.

### 6.2 Coming back to a collection

When the address has no list parameters (for example, the user clicks "Resources" in the sidebar), the collection restores the search, filters, sort and open record it had last in this browser tab, from session storage. It then writes them into the address with `replace`.

### 6.3 History

- Typing a search, changing a filter or a sort: the address is **replaced**, not pushed. The search waits 250 ms after the last key.
- Opening a record, following a linked record, opening the creation form: the address is **pushed**.
- Closing the panel with × or Escape:
  - if the current history entry was pushed by the collection, it goes **back** one entry;
  - otherwise, for example on a shared link, it **replaces** the address without `open`.

  So Back and × always agree. The router marks its own entries in `history.state`.
- The router's `navigate` gains the ability to set a query string without changing the path; `useSearchParams` already reads it.

### 6.4 Refresh

On load, in this order:

1. Read the address, and complete it from session storage (6.2).
2. Load as many pages as were loaded before the refresh, up to 5 pages, then restore the scroll position (section 8.4).
3. Open the record named in `open`, even when it is not in the loaded pages; it is fetched on its own.
4. Restore the panel history, so its Back link still works.
5. With `?new`, reopen the new record with the values typed before.

## 7. The record panel

### 7.1 Opening and history

- **Opening:**
  - clicking a card or a row opens its record;
  - clicking the open record again does nothing;
  - opening another record replaces the panel's content.
- **A linked record** opens in the same panel. The panel history gains an entry, and the top bar shows "‹ {previous record's name}". If the linked record has its own page (`opensAsPage`), the app navigates there instead.
- **Closing** clears the panel history.

### 7.2 States

| State | Shows |
|---|---|
| Loading | Grey placeholders where the title, properties and sections will be; the top bar's close button works |
| Loaded | The record (definition `panel`) |
| Unavailable (`404`, or `403` after a change of access) | "This record is no longer available." with Close; the record is removed from the list |
| Error (network, `5xx`) | "This record could not be loaded." with Retry and Close |

### 7.3 Editing in place

- Only when the property's id is in the person's `rights.edit` (section 7.7).
- **Text and long text:** clicking turns the value into a field with Cancel and Save.
  - Enter saves a one-line field; Escape cancels.
  - While saving, Save shows it is pending and the field is read-only.
  - An error shows under the field (its `ERROR_…` key, translated), and the field stays open.
- **Set choices** (select, person, switch): a menu or switch saves as soon as a choice is made. On error, the previous value comes back and the error shows under it.
- **Title:** edited the same way, when `title` is in `rights.edit`.
- **Only one value at a time:** opening another field first cancels the open one if it is unchanged, and asks otherwise.
- **After a save,** the record is updated in every loaded page and in the panel (section 8.3).

### 7.3.1 Showing what can be edited

- **In the panel:** an editable value looks like plain text until the pointer is over it or it has the keyboard focus. It then shows a light field (grey background, thin border) and a pencil on the right. Clicking anywhere on that field starts editing. Read-only values (dates, "Added by…", computed values) never show it, and the pointer stays an arrow over them.
- **In the table:**
  - every property that is shown and editable has **its own column**, built from its `PropertyDefinition`, and is edited **in its cell** with the rules of 7.3: a text value becomes a field (Enter or leaving saves, Escape cancels); a set of choices opens a menu that saves on choice;
  - an editable cell shows the same light field under the pointer or focus;
  - clicking an editable cell edits it; clicking anywhere else on the row (the name, a read-only cell, the empty space) opens the panel;
  - only one cell edits at a time, and saving updates the record everywhere (8.3).
- **The grey line under a name** holds only read-only facts, such as a file's type and size. A value that can change never hides there, because it couldn't be edited from the table.
- **A property that doesn't apply to a record** (the quantity of a document, in a list of several types) shows "—" and isn't editable.
- **Cards are for browsing:** they aren't edited in place, and clicking a card opens the panel.
- **Keyboard in the table:**
  - Tab moves through the editable cells of the focused row;
  - Enter starts editing the focused cell, or opens the record when the focus is on its name;
  - Escape cancels.
- **Tests (added to 15.4):**
  - an editable value shows its field on hover and focus, and a read-only one doesn't;
  - a table cell edits and saves, and Escape cancels;
  - clicking the name opens the panel instead of editing;
  - a property that doesn't apply shows "—" and doesn't edit.

### 7.4 Top bar and more actions

- **Top bar:** type chip (or Back link) on the left. On the right: favorite and Share (shown only when their feature exists), more actions, open full page, close.
- **More actions:** Open full page, Copy link, then a separator, then the definition's actions (Archive, Remove…).
  - An action that removes or archives asks for confirmation in a dialog with a danger button.
  - It then removes the record from the list and closes the panel.

### 7.5 Creating

There is no creation form: a new record is the normal record view, created as soon as it can stand on its own (decision 125).

- **Opening:**
  - "+ Add" (header, or the empty state) opens the panel and pushes `?new`.
  - The top bar shows "Not saved yet" and close only.
  - The name field is open and focused, with the placeholder "Name".
- **Defaults** come from `create.defaults(context, filters, currentUser)`:
  - the owner is the current user;
  - the status is the first of its lifecycle (a document starts as a draft);
  - the quantity is 1;
  - the context is linked;
  - **the active filters:** every filter with exactly one chosen value sets that property (Type: Document → type Document), and a scope filter links the new record to its parent (section 12.1). A filter with several values chosen sets nothing. Filter values win over the definition's own defaults, so a new record always belongs to the list it was created in.

  Every property is shown with its default and can be changed in place before the record exists.
- **Saving the first time:**
  - When every field in `create.required` has a valid value (usually when the name field loses focus or Enter is pressed), `source.create` sends the record.
  - On success:
    - the record is added at the top of the loaded list (even if the filters would hide it, until they change), and the total goes up;
    - the address becomes `?open={newId}` with `replace`;
    - the top bar shows the normal actions;
    - "Record created · Undo" shows for 5 seconds. Undo removes the record and closes the panel.
  - From then on, every change is an edit in place (7.3).
  - On error, the message shows under the field concerned, and nothing is created.
- **Before the first save:**
  - Values are kept in session storage, so a refresh keeps them (6.4).
  - A required field left empty shows "Enter a name to save this record." (or that field's message) once another value has been typed.
- **Leaving before the first save** (another record, close, Escape, Back):
  - with nothing typed, the panel closes and nothing is asked;
  - with something typed, "Discard this new record?" asks Keep editing or Discard.
- **The server never holds incomplete records.** Required columns stay required.
- **No creation:** a collection without `create` shows no "+ Add".

### 7.6 The description (Markdown)

- **Place:** under the properties, before the sections, in the panel and on the full page. It's labeled "Description".
- **Shown** with `react-markdown` and `remark-gfm`:
  - headings, paragraphs, bold, italic, lists, check lists, links, tables and code;
  - **raw HTML is not rendered** (react-markdown's default), and links open in a new tab with `rel="noopener noreferrer"`;
  - headings are styled one step smaller than the panel's title;
  - empty, it shows "Add a description" to someone who may edit it, and nothing to someone who may not.
- **Editing** (when `description` is in `rights.edit`):
  - The editing cue (7.3.1) covers the whole block, and clicking it opens the editor in place.
  - **Write tab:** a text field that grows with its content and holds the Markdown source.
  - **Preview tab:** the result, shown exactly as it will be.
  - **Toolbar:** bold, italic, heading, list, numbered list, link. Each inserts the Markdown syntax around the selection.
  - **Autosave:** there is no Save or Cancel button. The description saves 1 second after the person stops typing, and at once when the editor loses focus or the panel closes.
    - A status under the field says "Saving…", then "Saved".
    - On failure, it says "Not saved" with Retry, and the text stays in the editor and in session storage until a save succeeds, so a refresh doesn't lose it.
    - Saves are sent one at a time; only the latest text is sent after a running save.
    - Undo while writing is the text field's own (Ctrl/Cmd+Z).
    - Escape leaves the editor and shows the formatted description; nothing is lost, since it is saved.
    - Closing the panel while a save has failed asks "Your last changes to the description are not saved." (Retry · Leave anyway).
  - On a new record, the description counts as input (7.5); it is kept in the tab until the record is created, then saved with it.
- **Limit:** 20,000 characters, checked on both sides (`ERROR_DESCRIPTION_TOO_LONG`). The backend stores it as `text`. Existing `description` columns limited to 2,000 characters are widened when a collection adopts the archetype.
- **Files** aren't embedded in the description. They have their own section.

### 7.7 View and edit, value by value

- **Where rights come from:**
  - `definition.rights(record, user, context)` returns what this person may change on this record: which properties (and `title`, `description`), which sections may get "+ Link or add", and which actions are allowed;
  - the rule is the collection's own, from the person's role and responsibility. For example, a resource provider may change a booking's status but not its slots, and a colleague on the team may edit an intervention's documents;
  - **Recommended:** the server sends each record's rights with the record (`rights: { edit, add, actions }`), because it must check them anyway, and the definition simply reads them.
- **What the wrapper does with them:**
  - a value whose id is in `rights.edit` shows the editing cues (7.3.1) and edits in place, in the panel and in its table cell;
  - any other value is plain text;
  - a section shows "+ Link or add" only when it's in `rights.add`;
  - more actions lists only the actions in `rights.actions`, plus Open full page and Copy link, which are always there;
  - "+ Add" in the list header shows only when the person may create, which the collection decides from its context.
- **View only:** when `rights.edit`, `rights.add` and `rights.actions` are all empty, the top bar shows "View only" next to the type chip, and Share is hidden. Favorite stays, because it's personal.
- **The server is the authority.** Every change is checked again. A refused change (`403`, `ERROR_FORBIDDEN`) puts the previous value back and shows the message under the value. The record is then reloaded, so its rights are current.
- **Tests (added to 15.4):**
  - with rights on one property only, only that value shows cues and edits, in the panel and the table;
  - with no rights, "View only" shows, there's no "+ Link or add", the menu has only Open full page and Copy link, and the favorite stays;
  - a `403` on save restores the value and shows the message;
  - the description renders Markdown, doesn't render raw HTML, and edits with Write and Preview;
  - the description saves 1 s after typing stops and on leaving the field, shows Saving… then Saved, and on failure keeps the text and offers Retry; closing with a failed save asks first.

## 8. Loading the list

### 8.1 Infinite scroll

- `useInfiniteQuery`:
  - query key `[definition.key, 'list', context, search, filters, sort]`;
  - first page parameter `null`;
  - next page parameter `lastPage.nextCursor`.
- **Page size:** 30 records.
- **Drawing:** the list is virtualized with `useVirtualizer`, so only the visible cards or rows, plus a few around them, are in the page.
  - Rows are measured with `measureElement`, because a row's height depends on its content.
  - Cards use the virtualizer's `lanes` (one lane per column: 3, or 2 while the panel is open).
  - The table keeps its header in place, and rows scroll under it.
- **Loading more:** when the last drawn item is within the last 5 records loaded, and there is a next page and none is loading, it calls `fetchNextPage`. There is no separate marker.
- **While a page loads:** a loading row shows placeholder rows under the list.
- **When a page fails:** a row "More records could not be loaded." with Retry. The records already loaded stay.
- **The end of the list** shows nothing more. The header shows the total ("42 records"); with active search or filters, it shows "12 of 42 records".
- **Scrolling:** the list and the panel scroll separately; the page itself does not scroll in the side-by-side layout.

### 8.2 List states

| State | Shows |
|---|---|
| First load | Six placeholder cards or rows |
| Empty collection (no search, no filter) | Empty title and text, and "+ Add"; no toolbar |
| No results | "No records match your search" with Clear filters |
| Error | "Records could not be loaded." with Retry |

### 8.3 Keeping the cache right

- **After creating:** add the record to the first loaded page, and add 1 to the total.
- **After editing:** replace the record in every loaded page, and in its own query `[key, 'one', id]`.
- **After archiving or removing:** take the record out of every loaded page, subtract 1 from the total, and close the panel.
- **After any of these,** refetch the list's pages in the background, so a change of sort position appears.

### 8.4 Scroll position

- When the user leaves the list or the page unloads, the virtualizer's `takeSnapshot()` and `scrollOffset` are kept in session storage with the number of loaded pages (section 6.1).
- On return, the pages are reloaded (up to 5), then the virtualizer starts with `initialMeasurementsCache` and `initialOffset`, so the list lands at the same place without measuring everything again.

## 9. Layout by screen width

`useLayoutMode` reads `matchMedia`: `wide` at 1440 px and more, `medium` from 1024 to 1439 px, `narrow` below 1024 px.

| Mode | Panel closed | Panel open |
|---|---|---|
| `wide` | Sidebar · list | Sidebar · list beside the panel · panel (560 px by default, resizable: 9.1) |
| `medium` | Sidebar · list | Rail (57 px) · list beside the panel · panel. The sidebar folds for as long as the panel is open; the user's saved sidebar choice does not change |
| `narrow` | Top bar · list as rows (name, detail line, status) · one "Filters" button | The panel is the whole screen, with "‹ {collection}" to go back one level |

- **List beside the panel:** the table shows the columns of `columnPriority` that fit its width (name first, at least 160 px per column); cards go to two per row, or one under 520 px; under 480 px the toolbar wraps (search on its own line, then filters and the view switch).
- **Panel animation:** it slides in from the right in 200 ms, `easeOut`, with Motion. With reduced motion, there is no animation (like the sidebar).

### 9.1 Resizing the list and the panel

- **The divider** between the list and the panel can be dragged with the pointer. It shows under the pointer as a dark line with a grip, and the pointer becomes the resize cursor.
- **Limits while resizing:**
  - the panel is at least 400 px wide;
  - the list keeps at least 400 px;
  - the panel can grow up to that.
- **Keyboard:** the divider is focusable (`role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` = panel width, with min and max).
  - ← and → widen or narrow the panel by 16 px;
  - Home and End go to the limits;
  - Enter or a double-click puts back 560 px.
- **Remembering:** when the drag ends, the width is saved in local storage per collection.
  - The next panel that opens uses it, clamped to a **reasonable range**: at least 400 px, and at most the smaller of 720 px and 60% of the space for the list and the panel.
  - An extreme drag (almost all the room to the panel) stays for that visit, but the next opening comes back at that limit.
- **When the window changes size,** the width is clamped again to the limits above, and it isn't saved.
- **Medium layout:** resizing works the same, after the sidebar has folded.
- **Narrow layout:** there's no divider, because the panel is a page.
- **Full page:** there's no divider.
- **Tests (added to 15.4):**
  - dragging and the arrow keys change the width within the limits, and a double-click resets it;
  - after closing and reopening, the panel has the saved width;
  - a saved extreme width reopens at the limit;
  - the table shows fewer columns when the panel grows, keeping the name.

## 10. Keyboard and accessibility

- The list is a list of links. Each card or row is focusable and has the record's name as its accessible name, and the open one has `aria-current="true"`.
- **↑ / ↓:** move the focus between records. While the panel is open, they also open the focused record. At the end of the loaded records, ↓ loads the next page.
- **Enter:** opens the focused record.
- **Escape, in this order:**
  1. closes an open menu;
  2. cancels an open field;
  3. closes the panel, which asks first if a creation has input.
- **Focus:**
  - when the panel opens from the keyboard, the focus moves to its title;
  - when the panel closes, the focus returns to the record's card or row.
- **The panel is not a dialog.** It's a landmark (`<aside>` labeled with the record's name) that doesn't trap the focus, because the list stays usable.
- **Announcements:** the total and the "no results" state are announced with `aria-live="polite"` when they change.
- **Touch targets** are at least 32 px, as elsewhere in the app.

## 11. Reaching the data

The archetype doesn't impose routes on the backend. A collection gives a **data source**: an object of callbacks that `Collection` calls and nothing else. The wrapper never calls `fetch` itself.

```ts
type DataSource<T, C> = {
  list: (query: ListQuery, context: C) => Promise<Page<T>>
  one: (id: Id, context: C) => Promise<T>
  create?: (values: Partial<T>, context: C) => Promise<T>
  update?: (id: Id, patch: Partial<T>, context: C) => Promise<T>
  remove?: (id: Id, context: C) => Promise<void>
  archive?: (id: Id, context: C) => Promise<void>
  restore?: (id: Id, context: C) => Promise<void>   // Undo of an archive
}
```

### 11.1 The default REST adapter

Most collections use `restSource`, which builds that object from conventions. Each convention can be overridden.

```ts
const resources = restSource<Resource, { interventionId: Id }>({
  path: (ctx) => `/api/interventions/${ctx.interventionId}/resources`,   // or a fixed string
  routes: { archive: (id) => `/archive/${id}` },                          // override any route
  params: { search: 'search', cursor: 'after' },                         // rename any parameter
  toPage: (body) => ({ items: body.content, nextCursor: body.next, total: body.count }), // map any response
})
```

| Call | Default route | Can be overridden with |
|---|---|---|
| `list` | `GET {path}?q=&f.{id}=a,b&sort={by}:{asc\|desc}&cursor=&limit=30` → `{ items, nextCursor, total }` | `routes.list`, `params`, `toPage` |
| `one` | `GET {path}/{id}` | `routes.one`, `toRecord` |
| `create` | `POST {path}` | `routes.create` |
| `update` | `PATCH {path}/{id}` | `routes.update`, `method` |
| `remove` | `DELETE {path}/{id}` | `routes.remove` |
| `archive` | `POST {path}/{id}/archive` | `routes.archive` |
| `restore` | `POST {path}/{id}/restore` | `routes.restore` |

- **Any call can be replaced entirely,** for example when an endpoint doesn't exist yet or the data comes from elsewhere: `{ ...restSource(...), list: myOwnList }`.
- **Errors:**
  - the adapter turns an error response into an `ApiError` with its `ERROR_…` code and, when given, the field concerned;
  - a custom callback must throw the same `ApiError`;
  - the panel shows "no longer available" for `404` and `403`.
- **The cursor** is opaque to the frontend. Recommended for the backend: keyset pagination, where the cursor encodes the sort value and the UUID of the last record. A record created or removed while the user scrolls then never shifts the following pages. A backend that pages by offset still works through `toPage`, with that known weakness.
- **`total`** is optional. Without it, the header shows the number loaded so far ("30+ records").
- **Records** are identified by their UUID v7 only (CLAUDE.md).

## 12. Collections inside a record page

- A record page (an intervention) renders `Collection` inside one of its tabs, with `context` and `basePath` (decision 122).
- In the side-by-side layout, the panel takes the full height on the right, and the page's title and tabs stay above the list.
- `context` is passed to every data source call, so the definition can show what belongs to that context: for an intervention's document, the Specification switch, the requests it served there, the other interventions using it (decision 123).

### 12.1 Drilling into linked records

- **In the panel:**
  - a section shows its first 5 items;
  - when it has more, "Show all ⤢" shows on the section's title line, on the right (the count is already in the title).
- **"Show all"** navigates (push) to the linked collection's address with a scope filter, for example `/resources?f.linkedTo={parentId}`. The linked collection is any collection with a definition. Its section names it:

  ```ts
  sections: [{ id: 'linked', label: '…', collection: linkedDefinition, scope: (record) => ({ linkedTo: [record.id] }), preview: 5 }]
  ```

- **The scope filter** is a filter like the others, kept in the address. It shows as a chip ("Linked to: {parent name}", with ×) before the filter menus. A record created in a scoped list gets the parent link from `create.defaults`, which receives the active filters.
- **The strips (the views left behind):**
  - Each drill pushes the view being left onto a **view stack** in session storage. A view is its address and its saved state: scroll position, panel history.
  - Each stacked view shows as a strip, 32 px wide, after the sidebar:
    - a "‹" at the top;
    - the view's name written vertically ("{collection title} · {open record}");
    - the whole strip is one button that returns to that view.
  - Returning to a view takes it and every view after it off the stack, then restores it exactly (address, scroll, panel).
  - The browser's Back button does the same, one level at a time.
  - **At most 2 strips show.** With more levels, the first strip stands for all the older ones and opens a menu listing them, newest first.
  - **Removing the scope chip** leaves the plain collection, and the strips stay.
- **Width:**
  - the strips take space from the list;
  - in the medium layout (1024–1439 px), the sidebar folds as soon as a strip or a panel is shown;
  - below 1024 px there are no strips, and "‹" goes up one level.
- **Tests (added to 15.4):**
  - "Show all" opens the scoped list with its chip;
  - a strip returns to the previous view with its scroll and panel;
  - the browser's Back button does the same;
  - a third level folds the older views into the first strip's menu;
  - removing the chip keeps the strips;
  - creating in a scoped list links the new record;
  - creating in a list filtered on one value starts with that value, and a filter with several values sets nothing.

## 13. The full page

- **Address:** `{basePath}/{id}`, for example `/resources/{id}` or `/interventions/{id}/resources/{resourceId}`.
- **Breadcrumb:** it shows the context. Each step is a link; the last step is the record.
- **Layout:** `RecordView` in two columns. Properties and sections on the left (8 columns), activity on the right (4 columns).
- **Top bar:** favorite, Share, more actions. There's no close button and no "open full page".
- **Going back** to the list returns with `?open={id}`, so the panel is open on the record.

## 14. Text and translation

- Every label comes from i18next keys.
- **The wrapper's own texts** live in a shared `collection` namespace: Search, Filters, Clear filters, the totals, the states, the confirmation dialog.
- **The definition's texts** live in the collection's namespace: title, "+ Add …", "New …", properties, empty-state text.
- Both are provided in English and French.

## 15. How the archetype is tested

### 15.1 Tools

| Tool | Use | Already installed |
|---|---|---|
| **Vitest 5** with **jsdom** | Runs every test (`pnpm test`) | Yes |
| **Testing Library** (`@testing-library/react`, `user-event`, `jest-dom`) | Renders components and acts like a user: clicks, typing, keys | Yes |
| **MSW 3** | Fakes the backend over HTTP, so `restSource` is tested exactly as in the app | Yes |

There's no browser end-to-end tool in the project. Section 15.6 says when to add one.

### 15.2 Shared test setup

The wrapper is tested once, through a **test collection**, never through a real one. The setup lives next to the wrapper, in `collection/testing/`.

- **`testDefinition`:**
  - a definition of a fake kind of record ("Item": name, status, owner, description, one section of linked items);
  - it covers every property kind, a filter, two sorts, defaults and required fields.
- **`makeItems(n)`:** builds n items with stable UUIDs and names (`Item 001`…), so assertions don't depend on randomness.
- **MSW handlers** that behave like a real backend:
  - cursor pages of 30;
  - search on the name;
  - filters and sorts;
  - create, update, archive, restore and remove, kept in memory for the test.

  Each handler can be made to fail once (`500`) or to answer `404`, to test the error states.
- **jsdom has no layout,** so two things must be provided:
  - element sizes for the virtualizer: the list's scroll element gets a fixed height and width, and items get their estimated size, through `initialRect` and a stubbed `getBoundingClientRect`;
  - `window.matchMedia`, to choose the layout mode (wide, medium, narrow).

  A helper `setScreenWidth(px)` switches the mode inside a test.
- **Fake timers** (`vi.useFakeTimers`) for the 250 ms search delay and the 5 s Undo message.
- **`renderCollection({ url, width })`:**
  - starts the app's router at an address;
  - wraps the component in a fresh `QueryClient` with retries off;
  - clears session and local storage before each test.

### 15.3 Unit tests: the pieces without the screen

| Subject | Cases |
|---|---|
| Address ↔ state (`useCollectionState`) | Reads and writes search, filters (`f.{id}`), sort, `open` and `new`; leaves defaults out of the address; restores from session storage when the address is bare; replaces on search, filter and sort, pushes on open and `new` |
| `restSource` | Builds the default routes and parameters; uses overridden routes, parameters, `toPage` and `toRecord`; turns error responses into `ApiError` with the code and field |
| Cache updates (`useCollectionQuery`) | Create adds on top and adds 1 to the total; edit replaces the record in every page; archive and remove take it out and subtract 1 |
| Layout mode | 1440 → wide, 1024 → medium, 1023 → narrow |

### 15.4 Component tests: the archetype as a user sees it

Each line is one test with the test collection and MSW. Together they cover every rule of sections 6 to 10.

| Area | The test checks that… |
|---|---|
| **List** | the first page shows 30 items and the total; scrolling near the end loads the next 30 once; a failed page shows Retry, and Retry loads it; the end of the list loads nothing more |
| **Search and filters** | typing waits 250 ms, then shows only matching items and "n of 42"; a filter shows its count on its button; "Clear filters" resets both; no results shows its message |
| **Sort and view** | clicking a column header sorts through the server and updates the address; Cards / Table switch and are remembered after a re-render |
| **Panel** | clicking an item opens it, marks it and adds `?open`; clicking another switches; × and the browser's Back both close it and agree; a `404` shows "no longer available", and the item leaves the list |
| **Linked records** | an item of a section opens in the same panel with "‹ previous"; Back returns; a linked record with its own page navigates there |
| **Edit in place** | a text field saves with Save and with Enter, cancels with Escape; an error stays under the field; a menu value saves on choice and comes back on error; no field shows for a value not in `rights.edit` |
| **Creation** | "+ Add" shows the defaults and "Not saved yet"; filling the name creates the item once; it appears on top, open, with "Record created · Undo"; Undo removes it; leaving with nothing typed asks nothing; leaving with input asks, and Discard creates nothing |
| **Actions** | Remove asks, then removes and closes; Copy link copies the record's address |
| **Refresh** | re-rendering at the same address with the saved session state brings back the search, filters, open item, panel history, scroll position and a new record's typed values |
| **Layout** | at 1200 px, opening the panel folds the sidebar and closing unfolds it; at 900 px, the panel is a page with "‹ Records" |
| **Keyboard and accessibility** | ↑ / ↓ move and open with the panel open; Enter opens; Escape closes in the right order; focus goes to the panel's title and comes back to the row; the panel is a labeled landmark, not a dialog; the open item has `aria-current` |

### 15.5 Each real collection

A collection built on the archetype doesn't retest the wrapper. It tests only what its definition adds:
- its data source against its real endpoints (one MSW test, or the backend's integration test);
- its properties' validation;
- its defaults;
- one smoke test: the list shows, and one record opens.

On the backend, each list endpoint has an integration test (Failsafe, like the others) checking that cursor pages neither repeat nor skip records when one is created between two pages.

### 15.6 What jsdom can't check

Real scrolling smoothness, the panel's animation and true layout widths need a browser. For now, they're checked by hand in the running app after each change to the wrapper. When the wrapper starts changing often, add Playwright with one test per layout mode.

## 17. Delivery plan

The wrapper is built in small steps. Each step ends with something that can be **seen in the browser** and **checked by tests**, gets its own branch and pull request, and is validated before the next step starts.

### 17.1 How each step is validated

- **A showcase page,** available only in development (`/dev/collection`, behind `import.meta.env.DEV`). It shows the wrapper with a test collection of 300 fake items, from an in-memory data source (`memorySource(items)`).
  - It implements the same `DataSource` callbacks as `restSource`, with cursor pages, search, filters, sorts and rights.
  - It can be made slow or failing from a small switch on the page, to see the loading and error states.
  - Each step is shown there before any real collection uses it.
- **Tests** from section 15, written in the same step as the code they cover.
  - The component tests use `memorySource`.
  - The `restSource` tests use MSW.
- **CI green and the user's review** of the showcase page before merging.

### 17.2 Steps

| # | Step | What is built | Validated by |
|---|---|---|---|
| **0** | Groundwork | Add TanStack Table, TanStack Virtual, react-markdown, remark-gfm. The router learns query strings with push or replace, and marks its own history entries. Test helpers: `testDefinition`, `makeItems`, `memorySource`, layout and `matchMedia` stubs, `renderCollection`. The empty showcase page | Router tests; the existing app unchanged; the showcase page opens |
| **1** | Data layer | `DataSource`, `restSource` with overridable routes, parameters and response mapping, `ApiError`. `useCollectionQuery` (infinite query) and the cache updates (8.3) | Unit tests (15.3): routes, overrides, errors, cache updates |
| **2** | List, first page | `Collection` shell, header with total, Cards / Table switch, cards, the table on TanStack Table, the first-load, empty, no-results and error states | Showcase: 30 items as cards and as a table, each state from the switch. Component tests for the list states |
| **3** | Infinite scroll | TanStack Virtual for cards (lanes) and rows, loading more near the end, loading row, failed page with Retry | Showcase: scroll through 300 items smoothly; a failing page and Retry. Tests: next page once, Retry |
| **4** | Toolbar and address | Search (250 ms), filter menus with counts, Clear filters, sort by column, `useCollectionState` (address, replace or push), view and sort remembered | Showcase: reload keeps search, filters and sort; a copied link opens the same list. Unit tests of the address; component tests of search, filters, sort |
| **5** | Record panel, reading | Open, switch, close; `?open`; Back and × agree; marked record; top bar; `RecordView` read-only (properties, sections with their first 5, activity slot); loading, unavailable and error states; keyboard ↑ ↓ Enter Escape and focus | Showcase: browse records with the mouse and the keyboard; a removed item shows "no longer available". Panel, keyboard and accessibility tests |
| **6** | Editing and rights | `rights` per value; cues on hover and focus; edit in place in the panel (text, choices, switch, title); edit in table cells; view-only mode; `403` handling | Showcase: a switch to change the fake user's rights; edit a value in the panel and in the table; view only. Editing and rights tests |
| **7** | Description | `MarkdownView` and `MarkdownEditor` (Write, Preview, toolbar) with autosave and its status | Showcase: write Markdown, see it saved and shown; a failing save shows Retry. Description tests |
| **8** | Actions and full page | More actions menu, Copy link, Archive and Remove with confirmation, the full page with breadcrumb and two columns | Showcase: remove an item; open it full page and come back with the panel open. Action tests |
| **9** | Creation | New record with defaults (including the active filters), "Not saved yet", first save on the required fields, "Record created · Undo", discard confirmation | Showcase: create from a filtered list and find the item in it; Undo. Creation tests |
| **10** | Remembering the screen | Session storage: scroll position (virtualizer snapshot), panel history, a new record's input; restoring after a refresh and when coming back from the sidebar | Showcase: refresh in the middle of a long list with a panel open and a half-typed record. Refresh tests |
| **11** | Layouts and resizing | Medium (sidebar folds), narrow (panel as a page, list as rows), resizable divider with the saved width and its range, columns by priority | Showcase at 1440, 1200 and 900 px; drag the divider, close, reopen. Layout and resize tests |
| **12** | Drilling into linked records | "Show all" opens the linked collection with a scope chip; view stack and strips; creating there links to the parent | Showcase: a second fake collection linked to the first; drill two levels and come back. Drill-down tests |
| **13** | First real collections | Backend: the company's resources endpoints (list with cursor, search, filters, sort, total; one; create; update; archive; restore) and each record's `rights`, with their integration tests. Frontend: the Resources page on the wrapper, then the intervention's Resources tab (context, base path), replacing today's list and drawer | The app with real data; backend integration tests (cursor pages neither repeat nor skip); each collection's own tests (15.5) |

### 17.3 Order and dependencies

- **Steps 0 to 5 come in order.** Each needs the one before.
- **After step 5,** steps 6 to 12 depend only on 5 (and 9 on 6, since creation saves through the same editing path), so their order can change if priorities change.
- **The backend part of step 13 can start any time after step 1,** because the data contract is known by then. The frontend part comes last.
- **The showcase page stays** after step 13, as the place to check the wrapper whenever it changes. It is never built into production.

## 16. Open points

1. **Restoring after a refresh is limited to 5 pages** (150 records). Deeper than that, the list reopens at the top with the record still open in the panel. Is that acceptable?
2. **Session storage is per browser tab.** A record opened in a new tab starts from its address only, with no panel history. That's proposed as acceptable.
