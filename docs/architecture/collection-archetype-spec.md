# Intervio — collection archetype specification

**Date:** 2026-11-21  
**Purpose:** Everything decided for the list-and-record-panel archetype, so it can be built once as a generic wrapper and reused by every collection screen.  
**Frontend:** React 19, TanStack Query 5, HeroUI 3, Motion, i18next, the app's History-API router (`services/navigation`).  
**Sources:** decisions 109–126 in `use-cases.md`; screens 27–48 on `docs/Intervio.excalidraw` (area "List and record panel").

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
- The backend contract every collection endpoint follows (section 11).

**Out of scope (not decided, not built)**

- Selecting several records and acting on them at once.
- Choosing, reordering or resizing columns; saved views.
- Live updates pushed by the server.
- Favorites, sharing and the activity feed themselves. The panel has their places; each feature fills them when it is built.
- Virtualized rendering of very long lists (section 8.4).

## 2. Words used here

| Word | Meaning |
|---|---|
| **Collection** | A set of records of one kind shown on one screen: the company's resources, an intervention's resources, requests… |
| **Record** | One item of a collection. Its public identifier is its UUID v7. |
| **List** | The left side: the records as cards or as a table. |
| **Panel** | The right side, 560 px wide: one record, or the form that creates one. |
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

  // Data (section 11)
  fetchPage: (query: ListQuery, context: C) => Promise<Page<T>>
  fetchOne: (id: Id, context: C) => Promise<T>
  update?: (id: Id, patch: Partial<T>, context: C) => Promise<T>
  create?: {
    defaults: (context: C, filters: ListQuery['filters'], user: CurrentUser) => Partial<T>
    required: string[]                 // property ids that must have a value before the first save
    submit: (values: Partial<T>, context: C) => Promise<T>
  }
  actions?: ActionDefinition<T, C>[] // archive, remove…; each with its own confirmation

  // List
  filters: FilterDefinition[]
  sorts: { by: string; label: string }[]
  defaultSort: ListQuery['sort']
  card: (record: T) => CardContent      // type chip, title, detail line, status, avatar
  columns: ColumnDefinition<T>[]        // the full table
  compactColumns: string[]              // column ids kept while the panel is open (name, status)

  // Panel and full page
  panel: {
    type: (record: T) => string                 // the chip in the top bar
    title: (record: T) => string
    subtitle: (record: T) => string             // "Added by … on …"
    properties: PropertyDefinition<T>[]
    sections?: SectionDefinition<T, C>[]        // linked records, files…
    activity?: boolean
  }
  opensAsPage?: (record: T) => string | null    // a record people work inside: its page address
  canEdit?: (record: T) => boolean              // no field is shown when false
}
```

`PropertyDefinition` has a label key, a value getter and a kind: `text`, `longText`, `date`, `select` (with options), `person`, `chip`, `switch` or `custom` (a render function). An editable property also has a `validate` function returning an `ERROR_…` key or nothing.

`SectionDefinition` has a label key, a loader returning the linked records with a count, a renderer for one item, and an optional "+ Link or add" action. Each item opens in the same panel, or its page when `opensAsPage` says so.

`FilterDefinition` has an id, a label key, its options (fixed, or loaded once), and whether several can be chosen.

Usage:

```tsx
<Collection definition={resourcesDefinition} />
<Collection definition={interventionResourcesDefinition} context={{ interventionId }} basePath={`/interventions/${interventionId}/resources`} />
```

## 5. Component structure

One public component, `Collection`. Its parts are internal and are not used on their own.

| Part | Responsibility |
|---|---|
| `Collection` | Reads the state (section 6), chooses the layout (section 9), renders the parts below |
| `CollectionHeader` | Title, total, main action |
| `CollectionToolbar` | Search, filter menus with counts, "Clear filters", Cards / Table |
| `CollectionList` | Cards or table; the marked record; the loading row; empty, no-result and error states |
| `RecordPanel` | Top bar, panel history (Back), view or creation; loading and unavailable states |
| `RecordView` | Title, subtitle, properties, sections, activity; used by the panel and the full page |
| `PropertyRow` | One property: shows it, or edits it in place (section 7.3) |
| `NewRecord` | The record view before its first save: defaults, "Not saved yet", first save, Undo (section 7.5) |
| `RecordPage` | The full page: breadcrumb, `RecordView` in two columns (decision 120) |

Hooks, each in its own file and tested on its own:

| Hook | Does |
|---|---|
| `useCollectionState` | Reads and writes the address and the stored state (section 6) |
| `useCollectionQuery` | The infinite query and the cache updates (section 8) |
| `useLoadMore` | Calls `fetchNextPage` when the end of the list comes into view |
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
| View (cards or table), last sort | Local storage, per collection | A preference of this browser |
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
2. Load as many pages as were loaded before the refresh, up to 5 pages, then restore the scroll position.
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

- Only when `canEdit(record)` is true and the property is editable.
- **Text and long text:** clicking turns the value into a field with Cancel and Save.
  - Enter saves a one-line field; Escape cancels.
  - While saving, Save shows it is pending and the field is read-only.
  - An error shows under the field (its `ERROR_…` key, translated), and the field stays open.
- **Set choices** (select, person, switch): a menu or switch saves as soon as a choice is made. On error, the previous value comes back and the error shows under it.
- **Title:** edited the same way.
- **Only one value at a time:** opening another field first cancels the open one if it is unchanged, and asks otherwise.
- **After a save,** the record is updated in every loaded page and in the panel (section 8.3).

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
  - the type is the one chosen in the active filter;
  - the quantity is 1;
  - the context is linked.

  Every property is shown with its default and can be changed in place before the record exists.
- **Saving the first time:**
  - When every field in `create.required` has a valid value (usually when the name field loses focus or Enter is pressed), `create.submit` sends the record.
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

## 8. Loading the list

### 8.1 Infinite scroll

- `useInfiniteQuery`:
  - query key `[definition.key, 'list', context, search, filters, sort]`;
  - first page parameter `null`;
  - next page parameter `lastPage.nextCursor`.
- **Page size:** 30 records.
- **Loading more:**
  - an invisible marker after the last record is watched with `IntersectionObserver`, 600 px before it comes into view;
  - it calls `fetchNextPage` when there is a next page and none is loading.
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

### 8.4 Very long lists

Rendering is plain, with no virtualization. If a collection someday reaches thousands of loaded records and scrolling slows, virtualize `CollectionList` then. The page size and the 5-page refresh limit keep a normal list well below that.

## 9. Layout by screen width

`useLayoutMode` reads `matchMedia`: `wide` at 1440 px and more, `medium` from 1024 to 1439 px, `narrow` below 1024 px.

| Mode | Panel closed | Panel open |
|---|---|---|
| `wide` | Sidebar · list | Sidebar · compact list · panel (560 px) |
| `medium` | Sidebar · list | Rail (57 px) · compact list · panel. The sidebar folds for as long as the panel is open; the user's saved sidebar choice does not change |
| `narrow` | Top bar · list as rows (name, detail line, status) · one "Filters" button | The panel is the whole screen, with "‹ {collection}" to go back one level |

- **Compact list:** the table keeps `compactColumns`; cards go to two per row.
- **Panel animation:** it slides in from the right in 200 ms, `easeOut`, with Motion. With reduced motion, there is no animation (like the sidebar).

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

## 11. Backend contract

Every collection endpoint follows the same shape, so `fetchPage` and `fetchOne` stay one-liners.

```
GET    /api/{collection}?q=&f.{id}=a,b&sort={by}:{asc|desc}&cursor=&limit=30
       → 200 { "items": [...], "nextCursor": "…" | null, "total": 42 }
GET    /api/{collection}/{id}        → 200 record · 404 ERROR_NOT_FOUND
POST   /api/{collection}             → 201 record · 400 { "code": "ERROR_…", "field": "…" }
PATCH  /api/{collection}/{id}        → 200 record · 400 · 403 · 404
POST   /api/{collection}/{id}/archive · DELETE /api/{collection}/{id}
```

- **Nested collections** use the context's path, for example `/api/interventions/{id}/resources`.
- **The cursor** is opaque. It encodes the sort value and the UUID of the last record, which is keyset pagination, not an offset. A record created or removed while the user scrolls therefore never shifts the following pages.
- **`total`** counts the records matching the search and filters. Counting is acceptable at this size. If it ever becomes slow, it can be dropped from later pages.
- **`q`** searches the name and the description, case-insensitively.
- **Records** are identified by their UUID v7 only. Errors are `ERROR_…` codes, as everywhere (CLAUDE.md).

## 12. Collections inside a record page

- A record page (an intervention) renders `Collection` inside one of its tabs, with `context` and `basePath` (decision 122).
- In the side-by-side layout, the panel takes the full height on the right, and the page's title and tabs stay above the list.
- `context` is passed to every fetcher, so the definition can show what belongs to that context: for an intervention's document, the Specification switch, the requests it served there, the other interventions using it (decision 123).

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

## 15. Tests

The smallest set that fails if the logic breaks:

- `useCollectionState`:
  - reading and writing the address (search, filters, sort, `open`, `new`);
  - restoring from session storage when the address is bare;
  - replace or push per action.
- `Collection`, with a fake definition and a fake `fetchPage`:
  - open, switch and close a record, and check the Back button closes it;
  - load the next page when the marker comes into view, and retry after a failed page;
  - refresh with `?open` and scroll state, and check the same record and place come back;
  - create: defaults shown, first save when the name is filled, record on top and open, Undo removes it, leaving with input asks, leaving without input does not;
  - edit in place: save, cancel with Escape, error keeps the field open.
- Backend, one integration test per collection endpoint: cursor pages don't repeat or skip records when one is created between two pages.

## 16. Open points

1. **Restoring after a refresh is limited to 5 pages** (150 records). Deeper than that, the list reopens at the top with the record still open in the panel. Is that acceptable?
2. **Session storage is per browser tab.** A record opened in a new tab starts from its address only, with no panel history. That's proposed as acceptable.
