# Intervio — collection archetype specification

**Date:** 2026-11-21  
**Purpose:** Everything decided for the list-and-record-panel archetype, so it can be built once as a generic wrapper and reused by every collection screen.  
**Frontend:** React 19, TanStack Query 5, React Aria Components (through `ui-kit/aria`), Motion, i18next, the app's History-API router (`services/navigation`). Libraries and their roles: section 5.
**Sources:** decisions 109–140 in `use-cases.md`; screens 27–66 on `docs/Intervio.excalidraw` (area "List and record panel"), and 67–75 (area "Messages").

Anything not written here is **not decided**. Open points are listed in section 16.

## 1. Scope

**In scope**

- One generic wrapper, `Collection`, that knows nothing about the records it shows. A collection plugs in through a definition (section 4).
- The list: header, toolbar (search, filters), table (rows on narrow screens), infinite scroll.
- The record panel: view, edit in place, linked records, more actions, loading and unavailable states.
- Creating a record in the panel.
- The full page of a record, and collections nested in a record page.
- Remembering the screen across a refresh, the Back button and shared links.
- Layout by screen width, keyboard, accessibility.
- How a collection reaches its data: a default REST adapter whose routes and parameters can be overridden, or callbacks (section 11).
- How the archetype is tested (section 15).

**Out of scope (not decided, not built)**

- Choosing, reordering or resizing columns; saved views.
- Live updates pushed by the server.
- Favorites, sharing and the activity feed themselves. The panel has their places; each feature fills them when it is built.

## 2. Words used here

| Word | Meaning |
|---|---|
| **Collection** | A set of records of one kind shown on one screen: the company's resources, an intervention's resources, requests… |
| **Record** | One item of a collection. Its public identifier is its UUID v7. |
| **List** | The left side: the records as a table (rows on narrow screens). |
| **Panel** | The right side, 560 px wide by default and resizable: one record, or a new one. |
| **Full page** | One record shown as the main view ("Open full page"). |
| **Context** | The record a collection lives in, when there is one. For example, the intervention whose Resources tab is open. |
| **Definition** | The object a collection gives to `Collection`: how to fetch, show, filter, sort, create and edit its records. |

## 3. Behavior summary

| Topic | Rule | Decision |
|---|---|---|
| What opens where | Records people look at open in the panel; records people work inside (intervention, later offer) open their own page | 109 |
| List structure | Header (title, main action) · toolbar (search, filters) · records · loading row | 110 |
| Sorting | Every sortable header, the default order's column included: first click sorts in the column's first direction, second reverses it, third goes back to the default order. The default order marks no header and puts nothing in the address; a chosen sort is in the address even when it matches the default order | 110 |
| Loading more | **Infinite scroll**, no page numbers. The header shows the total ("42 records") | 110 |
| Panel position | Beside the list, never over it; the list stays usable; the open record is marked | 111 |
| Addresses | Every state that matters is in the address: search, filters, sort, open record, creation | 112 |
| Refresh | A refresh brings back the same screen: list state, open record, panel history, place in the list, unsaved creation | 126, 144 |
| Keyboard | ↑ / ↓ move between records with the panel open, Enter opens, Escape closes | 113 |
| Panel structure | Top bar · title · added-by line · properties · sections · activity | 114 |
| Linked records | One panel at a time, with a Back link; records with their own page open that page | 115 |
| Editing | In place: text saves when the field is left; set choices → menu that saves at once; a refused or failed change is a message | 116, 132 |
| More actions | Open full page, Copy link · Archive, Remove (with confirmation) | 117 |
| Creating | "New" opens the record view with defaults; it is created automatically once its required fields are filled; Undo for 5 s | 125 |
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
  filters: FilterDefinition[]          // fixed filters (their options); columns add theirs with `filter: true`
  defaultSort: Sort                     // the order when no sort level is chosen; a column with `sort` is sortable
  row?: { detail?: (record: T) => ReactNode; status?: (record: T) => ReactNode } // narrow screens: the line under the name, the status
  columns: ColumnDefinition<T>[]        // the full table; a column that shows a property names it, and is edited like it (7.3)

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

`SectionDefinition` has a label key, a loader returning the linked records with a count, a renderer for one item, and an optional "+ Link or add" action. Each item opens in the same panel, or its page when `opensAsPage` says so. **Built (2026-11-23, decision 143):** `link: (record) => patch` says how a record of the linked collection becomes linked (for parts, `{ item: id }`); with it, and `rights.add` naming the section (or no rights at all), the section shows "+ Link or add" (`record/LinkOrAdd.tsx`): a `PopoverDialog` with a search over the records the patch would change (the others are already linked), saved through the shared record actions, and the collection's "+ Add …", which drills into the scoped list with `?new=1`.

`FilterDefinition` has an id, a label key and its options (fixed, or loaded once). **Filter and sort rules (decision 149):** the logic lives in `collection/listing/` apart from any screen: `rules.ts` says which fields the Filter menu offers (`filterFields`: the fixed filters, then each column with `filter: true`, of the kind its field's type gives), the conditions of each kind (`OPERATORS`), how a rule is written (`ruleKey`: `status`, `quantity.gt`) and checked in memory (`matches`, `passes`), and how sort levels are written (`formatSort`, `parseSort`) and changed by a header (`nextSort`). **Composed rules (decision 161):** a `FilterGroup` (`{ join: "and" | "or", rules }`, rules or one level of groups) is checked by `passesGroup`; `plainOf` gives the plain `f.{key}` form when it can say it, `applied` leaves out rules without a value, and `parseGroup`/`formatGroup` read and write the `filter` parameter. The list state holds it as `where` (`ListQuery.where`), checked as well as the plain filters. `FilterMenu.tsx` and `SortMenu.tsx` are the two menus on top of it.

Usage:

```tsx
<Collection definition={resourcesDefinition} />
<Collection definition={interventionResourcesDefinition} context={{ interventionId }} />
```

A collection that lives inside a record gives `basePath` as a function of its context, `(context) => `/interventions/${context.interventionId}/resources``, so its list, its records' full pages and "Show all" from a section all carry that record in the path (decision 145). `listPathOf(definition, context)` gives the address; the `basePath` prop still overrides it.

## 5. Component structure

### 5.1 Libraries

| Library | Role | Already installed |
|---|---|---|
| **TanStack Query 5** | Loading, caching and refetching: `useInfiniteQuery` for the list, `useQuery` for one record, `useMutation` for create, edit and remove | Yes |
| **React Aria `Table`** (`ui-kit/aria/Table`) | The table itself: a grid with arrow-key navigation, row actions (`onRowAction` opens the record), sorting (`sortDescriptor`), virtualization (`Virtualizer` with `TableLayout`, 43 px rows) and infinite loading (`TableLoadMoreItem`). Editable cells keep their keys and focus through a stand-in for `keyboardNavigationBehavior="tab"` (documented, not yet in react-aria-components 1.22.1), marked in `ui-kit/aria/Table.tsx` to be replaced by that prop | Yes |
| **React Aria Components** | The visual parts' behavior (menus, fields, dialogs, the table), each styled once in `ui-kit/aria` with the theme tokens | Yes |
| **Motion** | The panel's slide | Yes |
| **react-markdown 10** with **remark-gfm 4** | Shows the description formatted, with GitHub-style lists, check lists and tables; raw HTML is not rendered | To add |

React Aria is unstyled: it holds behavior and accessibility, not styles. The look stays the app's (CLAUDE.md, visual identity).

### 5.2 Parts

One public component, `Collection`. Its parts are internal and are not used on their own.

| Part | Responsibility |
|---|---|
| `Collection` | Reads the state (section 6), chooses the layout (section 9), renders the parts below |
| `CollectionHeader` | Title, total, main action |
| `CollectionToolbar` | Search, the Filter and Sort menus with counts, "Clear filters" |
| Row numbers (decision 150) | Each row's place in the list shown (`positions` in the row marks store, so only the rows whose number changes render again), drawn by the ui-kit `Row` in the checkbox column; the checkbox replaces it on hover, focus or selection |
| Empty values in the panel (decision 151) | `ValueField` shows "Add {label}" for an empty value the person may set (`look="panel"`); pressed, its control is built awake and its first control is clicked (a menu, a picker) or focused (a field); leaving it empty shows the button again, unless the focus went to the control's own popover |
| Views (`views/`) | The types of view, one way of drawing the records each: the table (`views/table/`) on wide screens, rows (`views/rows/`) on narrow ones; the kanban later (MOH-30). Every type gets the same props, `ViewProps` in `views/viewProps.ts` (MOH-21): the records, loading more, the sort, saving a change, the rights, opening a record, the selection and the marks store; each uses what it needs, and what is its own stays in it (column widths and editing in cells for the table). The marks store and the scroll bookmark beside them are shared by every view. The configured views (decision 168) live here too. Search, filter, sort and the held order (`listing/`), the selection (`selection/`) and the panel (`record/`) are the collection's, not a view's. `Collection` keeps the empty, no-result and error states |
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
| View shown (decision 168) | Address: `?view={id}`, none for the first view | A shared link opens the same view; switching view starts the list again from its filters and sort |
| Open record | Address: `?open={id}` | A shared link opens the record; Back closes it |
| Creation in progress | Address: `?new` | Back cancels it; a refresh keeps it |
| Panel history (the Back links) | Session storage, per collection | Survives a refresh, not shared |
| Place in the list: the page of the first record in view (its cursor) and its row | Session storage, per collection and list | A refresh comes back to the same place, loading one page |
| Values typed in a creation | Session storage, per collection | A refresh does not lose them |
| Last sort, last view, panel width | Local storage, per collection | A preference of this browser; a bare address opens the last view with its filters and sort |
| Sidebar folded by a panel (medium width) | Not stored | It follows the panel |

Address format, on the collection's base path:

```
/resources?q=pump&f.type=document,equipment&f.quantity.gt=5&sort=status:asc,updated:desc&open=0192…
/interventions/0192…/resources?open=0193…
/resources?new
/resources?view=open
```

Filters use one parameter per rule: `f.{field}` for "is one of", with the chosen values separated by commas, and `f.{field}.{condition}` for the others (`not`, `contains`, `gt`, `lt`), with their value. Rules joined by "or", grouped, or with two rules on one condition go instead in one `filter` parameter, as JSON (decision 161); the data source receives it as `filter` too. The sort is its levels in order, separated by commas. Default values are left out of the address.

### 6.2 Coming back to a collection

When the address has no list parameters (for example, the user clicks "Resources" in the sidebar), the collection restores the search, filters, sort and open record it had last in this browser tab, from session storage. It then writes them into the address with `replace`.

### 6.3 History

- Typing a search, changing a filter or a sort: the address is **replaced**, not pushed. The search waits 250 ms after the last key.
- Opening a record, following a linked record, opening the creation form: the address is **pushed**.
- Switching from one open record to another (a row, ↑ / ↓) **replaces** the entry, so × and the browser's Back button both close the panel instead of stepping back through every record seen.
- Closing the panel with × or Escape:
  - if the current history entry was pushed by the collection, it goes **back** one entry;
  - otherwise, for example on a shared link, it **replaces** the address without `open`.

  So Back and × always agree. The router marks its own entries in `history.state`.
- A record's tab (decision 137) goes back through the history to that record when the linked steps were pushed, as × and Back do, so no stale entry is left behind.

**How the address is read and written (2026-11-23).** The query string is managed with nuqs (`services/navigation` re-exports it; `<QueryProvider>` at the app's root): each parameter has a typed parser in `collection/address.ts` (`q`, `sort`, `f.{id}`, `open`, `new`, `linked`), defaults are left out of the address, and changes to the list are batched into one replaced entry. The panel's parameters are read with nuqs but written with the router's `navigate`, built by nuqs's serializer, because those entries carry marks in `history.state` (the panel opened here, a linked step, the drill depth) that nuqs can't set.

**Pages (2026-11-23, decision 142).** Pages are matched by React Router 8 in data mode: one router (`createRouter` in `services/navigation/router.ts`), and `navigate()` goes through it, so code outside components keeps calling it. React Router keeps an entry's state under `history.state.usr`; `entryState()` and `isOwnEntry()` read it there, and the marks survive nuqs's updates (nuqs keeps the whole `history.state`) and Back and Forward. nuqs uses its React Router adapter, which follows the router's navigations by itself. Tests render through `<AddressProvider>`, a router with one page at every address.

### 6.4 Refresh

On load, in this order:

1. Read the address, and complete it from session storage (6.2).
2. Load the page holding the first record that was in view, and scroll to it (section 8.4).
3. Open the record named in `open`, even when it is not in the loaded pages; it is fetched on its own.
4. Restore the panel history, so its Back link still works.
5. With `?new`, reopen the new record with the values typed before.

## 7. The record panel

### 7.1 Opening and history

- **Opening:**
  - clicking a row (anywhere but an editable cell), pressing Enter on it, or its **Open** button opens its record. The Open button sits at the end of the row's first cell and shows on the row under the pointer or the focus, since editable cells leave little else to click;
  - clicking the open record again does nothing;
  - opening another record replaces the panel's content.
- **A linked record** opens in the same panel (decision 137):
  - the record left folds into a **tab** between the list and the panel: 32 px, a ‹ at the top, its name written vertically; the tab takes its room from the list, so the panel keeps its width;
  - clicking a tab opens that record again and removes the tabs after it;
  - at most 2 tabs show; with more steps, the first stands for the older records ("2 earlier records") and opens a menu of them, newest first;
  - a linked record of another collection shows that collection's panel definition; one with its own page (`opensAsPage`) navigates there instead;
  - each step pushes an address, so the browser's Back goes back one step.
- **Closing (×)** goes back one step: it opens the previous record, and closes the panel only when there is none left.
- **Below 1024 px** there are no tabs and no other back control: × goes back one step, and "‹ {collection}" returns to the list.

### 7.2 States

| State | Shows |
|---|---|
| Loading | Grey placeholders where the title, properties and sections will be; the top bar's close button works |
| Loaded | The record (definition `panel`) |
| Unavailable (`404`, or `403` after a change of access) | "This record is no longer available." with Close; the record is removed from the list |
| Error (network, `5xx`) | "This record could not be loaded." with Retry and Close |

### 7.3 Editing in place

- Only when the property's id is in the person's `rights.edit` (section 7.7).
- **Text and long text:** the value is a field that looks like plain text; the change saves when the field is left or Enter is pressed, and Escape puts the value back.
- **Set choices** (select, person, switch): a menu or switch saves as soon as a choice is made, showing the new value at once.
- **Numbers** (`number` in the definition): a number field formatted for the language, with `decimals` digits after the point (0 for a whole number), optional `min`, `max` and `step`, and two small chevrons on the right that step it up and down (in the table, under the pointer or the focus only). Leaving it, Enter or a step saves; an empty field saves no value; a value outside the limits is brought back to the nearest one.
- **A refused or failed change** puts the value back and shows a message (7.8): an invalid value, a missing right (`403`), a record removed meanwhile (`404`: the list refreshes and the panel closes), or a failed save (with Retry).
- **Title:** edited the same way, when `title` is in `rights.edit`.
- **Only one value at a time:** opening another field first cancels the open one if it is unchanged, and asks otherwise.
- **After a save,** the record is updated in every loaded page and in the panel (section 8.3).

### 7.3.0 Field types

Decision 133. A column or a property says how its value shows and is edited with one `field`, whose `type` is one of:

| Type | Read view | Editor | Built on |
|---|---|---|---|
| `text` | the text | in place, saved when left | — |
| `richText` | formatted Markdown; the table shows the first line | panel: the Markdown editor (7.6); table: opens the record | react-markdown |
| `number` | formatted, with `decimals` | number field with steppers | React Aria NumberField |
| `select` | its chip | menu, saved on choice | React Aria Menu |
| `multiSelect` | chips (the table: the first ones, then "+n") | menu with checkmarks, saved when it closes | React Aria Menu |
| `date` | the date in the user's language | date field and calendar; optional time | React Aria DatePicker |
| `dateRange` | the period in the user's language | two date fields and a range calendar (first click the start, second the end); optional time | React Aria DateRangePicker |
| `checkbox` | a checkbox | saved on click | React Aria Checkbox |
| `url` | the link (its domain), in a new tab | text field, checked as a web address | — |
| `email` | a `mailto:` link | text field, checked as an email address | — |
| `phone` | a `tel:` link | text field: digits, spaces, a leading + | — |
| `location` | the address, with a link to open it in a map | text field | — |
| `avatar` | the uploaded picture | upload or replace, through the files service | files service |
| `icon` | the icon | a grid of Lucide icons in a popover, with search | Lucide files |
| `file` | table: the count; panel: the list with type and size | panel: add (drop or browse) and remove; table: opens the record | files service |

Every type follows the same rules: read view only without the right; saved when left, chosen or toggled; a refused change goes back and is reported (7.8).

### 7.3.1 Showing what can be edited

- **In the panel:** an editable value looks like plain text until the pointer is over it or it has the keyboard focus. It then shows a light field (grey background), with no icon. Clicking anywhere on that field starts editing. Read-only values (dates, "Added by…", computed values) never show it, and the pointer stays an arrow over them.
- **In the table:**
  - every property that is shown and editable has **its own column**, built from its `PropertyDefinition`, and is edited **in its cell** with the rules of 7.3: a text value becomes a field (Enter or leaving saves, Escape cancels); a set of choices opens a menu that saves on choice;
  - an editable cell looks exactly like the other cells: no field, no border, the same font and color; only the text cursor over it tells it can be edited. Leaving the cell saves (Enter too), Escape puts the saved value back, and a refused value comes back with a short message under the cell;
  - clicking an editable cell edits it; clicking anywhere else on the row (the name, a read-only cell, the empty space) opens the panel;
  - only one cell edits at a time, and saving updates the record everywhere (8.3).
- **The grey line under a name** holds only read-only facts, such as a file's type and size. A value that can change never hides there, because it couldn't be edited from the table.
- **A property that doesn't apply to a record** (the quantity of a document, in a list of several types) shows "—" and isn't editable.
- **Keyboard in the table:**
  - Tab moves through the editable cells of the focused row;
  - Enter starts editing the focused cell, or opens the record when the focus is on its name;
  - Escape cancels.
- **Tests (added to 15.4):**
  - an editable value shows its field on hover and focus, and a read-only one doesn't;
  - a table cell edits and saves, and Escape cancels;
  - clicking the name opens the panel instead of editing;
  - a property that doesn't apply shows "—" and doesn't edit.

### 7.8 Messages

Decision 132; screens 67 to 75. The **notifications service** (`services/notifications`) is the app's only way to notify: every screen calls its `notify()`, never a toast library directly, and its `Notifications` (HeroUI's `Toast.Provider`, mounted once at the root) is the only toaster. HeroUI's toast does the queue, the timing and the announcements; the service adds the scope and the key below. A component from another library that wants to notify is wired to `notify` through its callback, and its own toaster is turned off.

- **A message** has a text, a tone (error or confirmation), an optional action (Retry, Undo), a **scope** and an optional **key**.
  - The scope is the interaction it belongs to: a record (`{collection}:record:{id}`) or the collection (`{collection}`). Leaving it removes its messages: opening another record, closing the panel, opening the full page, leaving the collection.
  - The key names the value concerned (`{collection}:{id}:{field}`): a new message with the same key replaces the old one, and a successful save of that value removes it.
- **Timing:** without an action, 6 seconds; with one, until it is used, closed or its scope ends. Pointing at it or focusing it pauses the countdown.
- **At most three** show; a fourth pushes the oldest out. The newest is at the bottom.
- **Accessibility:** HeroUI's toast region (React Aria) announces each message, never takes the focus, and is reached with Alt+T; its buttons are reachable with Tab.
- **Where each case comes from:**

| Case | Message | Scope |
|---|---|---|
| Invalid value on leaving the field | "{validation text} It was put back." | record |
| `403` on a save | "You can no longer change “{field}” on {name}." | record |
| `404` on a save | "{name} is no longer available. The list was refreshed." (lists refresh, panel closes) | collection |
| Other failed save | "“{field}” couldn't be saved for {name}." · Retry | record |
| Creation failed | "The record couldn't be created." · Retry (what was typed stays) | new record |
| Archive or Remove failed | "{name} couldn't be archived / removed." · Retry | collection |
| Archived (one, or several selected) | "{name} archived" / "{count} archived" · Undo (restores them; an archived record stays in the database, a removed one does not) | collection |
| Undo of an archive failed | "{name} couldn't be restored." | collection |
| Undo failed | "{name} couldn't be removed." | collection |
| Copy link | "Link copied" / "The link couldn't be copied." | record |
| Created | "Record created" · Undo | collection |

- **Not messages:** the description's status line (7.6) and the loading states (7.2, 8.2).

### 7.4 Top bar and more actions

- **Top bar:** type chip (or Back link) on the left. On the right: favorite and Share (shown only when their feature exists), more actions, open full page, close.
- **More actions:** Open full page, Copy link, then a separator, then the definition's actions (Archive, Remove…).
  - An action that removes or archives asks for confirmation in a dialog with a danger button.
  - It then removes the record from the list and closes the panel.
  - A linked record (decision 137) has the same menu, with its own collection's actions; archiving or removing it goes back one step.

### 7.5 Creating

**Built so far (step 9):** `definition.create` gives `add` (the button's text), `defaults(context)` and `ready(draft)`; a filter with a `patch` and exactly one value chosen adds that value. The new record is `?new=1`; its input waits in the tab (`intervio.collection.<key>.new`) until it is created or discarded.

There is no creation form: a new record is the normal record view, created as soon as it can stand on its own (decision 125).

- **Opening:**
  - "New" (header, or the empty state) opens the panel and pushes `?new`.
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
  - On error, nothing is created, what was typed stays, and a message offers Retry (7.8).
- **Before the first save:**
  - Values are kept in session storage, so a refresh keeps them (6.4).
  - A required field left empty shows "Enter a name to save this record." (or that field's message) once another value has been typed.
- **Leaving before the first save** (another record, close, Escape, Back):
  - with nothing typed, the panel closes and nothing is asked;
  - with something typed, "Discard this new record?" asks Keep editing or Discard.
- **The server never holds incomplete records.** Required columns stay required.
- **No creation:** a collection without `create` shows no "New".

### 7.6 The description (Markdown)

- **Place:** under the properties, before the sections, in the panel and on the full page. It's labeled "Description".
- **Shown in its editor from the start** (decision 146): a rich-text editor (Plate, headless, drawn with the ui-kit) showing the formatted text. There is no separate view to click into, no Write or Preview tab, and the Markdown source is never shown.
  - It shows headings, paragraphs, bold, italic, lists, numbered lists and links. Raw HTML is never rendered, and links open in a new tab with `rel="noopener noreferrer"`.
  - Headings are styled one step smaller than the panel's title.
  - Empty, it shows "Add a description" to someone who may edit it, and nothing to someone who may not.
  - Without `description` in `rights.edit`, the same editor is read-only.
- **Stored as Markdown:** the editor reads the Markdown string it receives and writes one back (Plate's Markdown plugin, with GFM). The backend only ever sees the string.
- **Markdown the editor can't keep** is rewritten on the first edit; opening alone never changes it. Accepted for now (decided 2026-11-24): images stay in the Markdown but aren't shown in the editor, and an image inside a line splits that line into separate blocks (#36), raw HTML blocks are altered (#37), checklists lose their ticks (#38), and a single line break becomes a hard break (#39). Tables, quotes, code, strikethrough and nested lists are kept.
- **Editing** (when `description` is in `rights.edit`):
  - The person writes in the description directly; the editing cue (7.3.1) shows on hover.
  - **Toolbar:** bold, italic, heading, list, numbered list, link. It shows while the cursor is in the description, and formats the text directly.
  - **Autosave:** there is no Save or Cancel button. The description saves 1 second after the person stops typing, and at once when the editor loses focus or the panel closes.
    - Opening a description never saves it: only a change the person makes does. The editor may write the same Markdown differently (`-` for `*`), so the saved string is compared with the last one saved.
    - A status under the editor says "Saving…", then "Saved".
    - If the text can't be converted to Markdown, nothing is sent and a notification says why.
    - On failure, it says "Not saved" with Retry, and the text stays in the editor and in session storage until a save succeeds, so a refresh doesn't lose it.
    - Saves are sent one at a time; only the latest text is sent after a running save.
    - Undo while writing is the editor's own (Ctrl/Cmd+Z).
    - Escape leaves the editor; nothing is lost, since it is saved.
    - Closing the panel while a save has failed asks "Your last changes to the description are not saved." (Retry · Leave anyway).
  - On a new record, the description counts as input (7.5); it is kept in the tab until the record is created, then saved with it.
- **Limit:** 20,000 characters of Markdown (the string sent), checked on both sides (`ERROR_DESCRIPTION_TOO_LONG`). The backend stores it as `text`. Existing `description` columns limited to 2,000 characters are widened when a collection adopts the archetype.
- **Files** aren't embedded in the description. They have their own section.

### 7.7 View and edit, value by value

**Built so far (step 6):** `rights(record, context)` returns `{ edit }`, the ids of the columns, properties and `title` the person may change; without a `rights` function, every editable value can be changed. `add` and `actions` join it with the steps that build sections' "+ Link or add" (12) and more actions (8).

- **Where rights come from:**
  - `definition.rights(record, user, context)` returns what this person may change on this record: which properties (and `title`, `description`), which sections may get "+ Link or add", and which actions are allowed;
  - the rule is the collection's own, from the person's role and responsibility. For example, a resource provider may change a booking's status but not its slots, and a colleague on the team may edit an intervention's documents;
  - **Recommended:** the server sends each record's rights with the record (`rights: { edit, add, actions }`), because it must check them anyway, and the definition simply reads them.
- **What the wrapper does with them:**
  - a value whose id is in `rights.edit` shows the editing cues (7.3.1) and edits in place, in the panel and in its table cell;
  - any other value is plain text;
  - a section shows "+ Link or add" only when it's in `rights.add`;
  - more actions lists only the actions in `rights.actions`, plus Open full page and Copy link, which are always there;
  - "New" in the list header shows only when the person may create, which the collection decides from its context.
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
- **Drawing:** the list is virtualized by React Aria's `Virtualizer` with `TableLayout`: only the rows (and the columns) in view are in the page.
  - Rows are measured with `measureElement`, because a row's height depends on its content.
  - The table keeps its header in place, and rows scroll under it.
- **Keeping the table fast** (2026-11-22; budget: an action shows its result within 100 ms):
  - React Aria builds every row again when a value its rows depend on changes. So the open row and the selection don't reach the rows as props: rows and cells read them from a small store (`list/rowMarks.ts`), and a change renders only the rows concerned. A test (`list/Rerender.test.tsx`) fails if selecting a row renders the others.
  - Inside table cells, `Show`, `Switch` and `Variant` change views without a fade (`NoFadeInside` in `ui-kit/views/Show.tsx`): hundreds of fades re-rendered with every row.
  - A cell's control waits for its row (decision 139): a date, a period or a number shows as text (`values/Asleep.tsx`); a text field, a link, a choice, tags and a checkbox draw a still copy with the same look and accessible name (`StillCell` in `values/StillValue.tsx`); the row's selection checkbox is a still box (`selectionAsleep` on the ui-kit's `Row`), real once the row is reached or selected. When the row is under the pointer or the focus, its controls mount in their place, looking the same. Removing or moving rows (archive, sort) redraws fewer and lighter rows: sorting about 40% faster, archiving about 15%. The text takes the focus, so the keyboard reaches the editor as before. In the panel, every value (decision 139, 2026-11-23): dates, periods and numbers draw their `Asleep` text with the editor's look (padding, calendar button, chevrons); the other kinds draw a still copy of their control (`values/StillValue.tsx`: the text field's padding, the menu button, the checkbox's box, the picture's and files' buttons as plain buttons, so they size and align the same). The value wakes when the pointer is over it, the focus reaches it (Tab included) or a file is dragged over it; then its control mounts and takes the focus, the one marked `data-wake` if any (`values/WakeOnReach.tsx`, `useHandFocus`). Opening a record builds no React Aria control but the title's field. The title stays a field: the focus goes to it when a record opens.
  - Opening a record builds its panel in one render (2026-11-23): the table no longer renders, the editors sleep, and the linked records wait until the panel is scrolled near them (`WhenNear` in `record/RecordBody.tsx`, an `IntersectionObserver` with a 200 px margin). The earlier split (the values one render after the panel, `useDeferredValue`) was removed: React renders a deferred render in slices and starts it again whenever the record's data or a section's arrives, and the content showed after about 350 ms instead of 180.
  - The table doesn't render when the open record changes (2026-11-23): `RecordTable` is memoized and gets only stable props (the marks store, memoized objects, stable setters), and the panel's width no longer reaches it (fixed column widths). Cells don't listen to React Aria's table state, which changes whenever the focus enters or leaves the table: they read it from a box kept up to date (`LatestState` in `ui-kit/aria/Table.tsx`). A test (`list/Rerender.test.tsx`) fails if opening a record, or the next one, renders the table.
  - React Scan outlines re-renders in `make dev`; `VITE_SHOWCASE=1 vite build` measures the showcase in a production build.
- **Loading more:** when the last drawn item is within the last 5 records loaded, and there is a next page and none is loading, it calls `fetchNextPage`. There is no separate marker.
- **While a page loads:** a loading row shows placeholder rows under the list.
- **When a page fails:** a row "More records could not be loaded." with Retry. The records already loaded stay.
- **The end of the list** shows nothing more. The header shows no total (decision 148).
- **Scrolling:** the list and the panel scroll separately; the page itself does not scroll in the side-by-side layout.

### 8.2 List states

| State | Shows |
|---|---|
| First load | Six placeholder rows |
| Empty collection (no search, no filter) | Empty title and text, and "New"; no toolbar |
| No results | "No records match your search" with Clear filters |
| Error | "Records could not be loaded." with Retry |

### 8.3 Keeping the cache right

- **After creating:** add the record to the first loaded page, and add 1 to the total.
- **After editing:** replace the record in every loaded page, and in its own query `[key, 'one', id]`.
- **After archiving or removing:** take the record out of every loaded page, subtract 1 from the total, and close the panel.
- **After any of these,** refetch the list's pages in the background. An edited record keeps its place (section 8.6): the new order shows when the list is sorted again.

**Record actions, shared (built 2026-11-23).** None of the above is written in the collection screen: every change to a record goes through one shared layer, so any component can change a record of any collection, with or without that collection on screen.

- `useRecordActions(definition, context, basePath?)` returns `canEdit`, `allowed` (the actions the rights allow), `save`, `report`, `act` (an action's confirmation, then the action), `runMany` (several records), `create`, and `menu` / `runMenu` (More actions). Each goes through the data source, keeps the cache right as above, and reports failures as messages.
- `useRecordChanges(listener)` hears every change, `{ key, id, kind: updated | created | removed, record }`. The collection screen uses it for what is its own: a changed record of its list keeps its place (8.6), wherever it was changed; a removed one leaves the selection, and the panel, full page or linked record showing it closes.
- `confirm({ title, text, button, cancel?, danger? })` resolves to true or false. One `<Confirmations />` host, beside `<Notifications />` at the app's root, shows it; it belongs to the collection service.

### 8.4 Scroll position

Decision 144 (2026-11-23). A refresh costs one request whatever the depth: the list starts at the page that was in view, and the pages above load as the person scrolls up, like any other page.

- **The bookmark:** one session key per collection (`intervio.collection.<key>.scroll`) holds the list it belongs to (search, filters, sort), the page holding the first row in view (its page parameter: a cursor and a direction) and that row's place in the page. It is written as the person scrolls (`list/scrollBookmark.ts`, `useScrollBookmark`), and used only when the list matches.
- **Pages in both directions:** the data source takes `direction: 'before'` with a cursor and answers the page ending just before it; each page carries `previousCursor` (null at the start of the list). `restSource` sends it as `?before={cursor}` (the parameter's name is set by `params.before`). `useCollectionQuery` starts at the bookmark's page and loads the pages above with `fetchPreviousPage`.
- **Restoring:** once the page is there, the list scrolls to the row (rows are one height, `ROW_HEIGHT`, so the position is counted). Within 5 rows of the top, the page before loads at once and again as the person scrolls up near the top; the rows added above move the scroll by their height, so the rows in view stay put. Nothing is reserved for the records not loaded: the scrollbar not being at the top is the cue that more is above.
- **A record gone since:** a cursor is a sort value and an id, so the page after it starts at the next record in the order.

### 8.5 Selecting several records

Decision 134; screens 60 to 63.

- **Checkboxes:** React Aria's row selection (`selectionMode="multiple"`, `selectionBehavior="toggle"`), a checkbox at the start of each row and in the header (a dash when some rows are selected). With nothing selected, a press on a row opens its record. Once a row is selected, a press on another row adds it to the selection or takes it out (React Aria's toggle behavior), and the › button on the row still opens the record. Space selects the focused row.
- **Select all:** the header checkbox selects the loaded rows. Records loaded later are not added.
- **The toolbar:** while rows are selected, the toolbar shows, in place of the search and the filters: "3 selected", then each action allowed on at least one selected record (spec 7.4 `actions`, checked with `rights`), then a button that clears the selection. Escape in the table clears it too.
- **Confirmation:** the action's confirmation, in the plural; when some selected records don't allow it, the title says how many it applies to ("Archive 2 of 3 records?") and the text names one record left out.
- **Running:** each record goes through the data source's `archive` or `remove`, one at a time. Those that succeed leave the list; those that fail stay selected, and one message says so (the record's name when one failed, the count otherwise), with Retry for them.
- **Changes of view:** a new search, filter or sort clears the selection.
- **Changing several at once** (decision 135; screens 64, 65): a value changed on a selected row is saved on every selected row, for the types several records can share (single select, multi select, checkbox, date, date range, number, owner; a column can opt out with `bulk: false`). The single and multi select menus say "Applies to 3 items" (in the collection's words); a checkbox, a number or a date has no menu, so the message after the change says it. The change is sent in **one request** when the data source has `updateMany` (decision 147), and the list updates and reloads once; otherwise each record is saved on its own. Records without the right, or that are refused or fail, keep their value. Afterwards one message: "Status changed on 3 records." (or "on 2 of 3"), with Undo, which puts back each record's own previous value (one request per previous value). Failed records stay selected, with Retry.

### 8.6 A changed record keeps its place

Decision 136; screens 65, 66.

- **The order is held:** after an edit, the table keeps showing the loaded records in the order it had, with their new values, even when one no longer matches the sort or a filter. The background refetch updates the values and the total, not the positions.
- **The line:** while a record is out of order, a line at the right of the toolbar says, in the collection's words, how many changed records keep their place ("After a change, 2 items keep their place.") with **Sort now**.
- **Sorted again** when the person presses Sort now, changes the sort, search or filters, clears the selection, opens another record, or reloads the page.


`useLayoutMode` reads `matchMedia`: `wide` at 1440 px and more, `medium` from 1024 to 1439 px, `narrow` below 1024 px.

| Mode | Panel closed | Panel open |
|---|---|---|
| `wide` | Sidebar · list | Sidebar · list beside the panel · panel (560 px by default, resizable: 9.1) |
| `medium` | Sidebar · list | Rail (57 px) · list beside the panel · panel. The sidebar folds for as long as the panel is open; the user's saved sidebar choice does not change |
| `narrow` | Top bar · list as rows (name, detail line, status) · the Filter and Sort menus | The panel is the whole screen, with "‹ {collection}" to go back one level |

- **List beside the panel:** the table keeps every column at its width (`column.width`, 200 px when not given) and scrolls sideways when they don't fit; the selection checkbox and the name stay pinned on the left (decision 138). Under 480 px the toolbar wraps (search on its own line, then filters and the view switch).
- **Panel animation:** it slides in from the right in 200 ms, `easeOut`, with Motion. With reduced motion, there is no animation (like the sidebar).

**Built so far (step 11):** layout modes, the divider and the saved width are built. Columns by priority were replaced (2026-11-23) by fixed widths with a horizontal scroll and pinned name (decision 138): `ui-kit/aria/tableLayout.ts` subclasses React Aria's `TableLayout` so the table lays its rows out again only when its height changes (not when the panel changes its width), and pins every column up to the row header. The medium fold goes through `foldSidebar` in the ui-kit, which the board layout reads. **Narrow screens (built 2026-11-23, decision 121):** the list is rows (`views/rows/RecordRows.tsx`, React Aria's GridList, virtualized: `RowList` in `ui-kit/aria/List.tsx`): the name, the line under it (`definition.row.detail`, else the panel's subtitle) and the status (`definition.row.status`); a row opens its record; no selection. The toolbar shows the same Filter and Sort menus as on wide screens (decision 149); the Sort menu is the way to sort, as the rows have no headers. The toolbar stays while a new sort or filter loads; it is hidden only for a collection with no records at all.

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
  - the columns keep their widths as the panel opens and grows, and the name stays pinned.

## 10. Keyboard and accessibility

- The list is a list of links. Each row is focusable and has the record's name as its accessible name, and the open one has `aria-current="true"`.
- **↑ / ↓:** move the focus between records. While the panel is open, they also open the focused record. At the end of the loaded records, ↓ loads the next page.
- **Enter:** opens the focused record.
- **Escape, in this order:**
  1. closes an open menu;
  2. cancels an open field;
  3. closes the panel, which asks first if a creation has input.
- **Focus:**
  - when the panel opens from the keyboard, the focus moves to its title;
  - when the panel closes, the focus returns to the record's row.
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
  updateMany?: (ids: Id[], patch: Partial<T>, context: C) =>          // one change on several records (8.5)
    Promise<{ updated: T[]; failed: { id: Id; code: string }[] }>
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
| `list` | `GET {path}?q=&f.{id}=a,b&f.{id}.{condition}=v&sort={by}:{asc\|desc},…&cursor=&limit=30` → `{ items, nextCursor, total }` | `routes.list`, `params`, `toPage` |
| `one` | `GET {path}/{id}` | `routes.one`, `toRecord` |
| `create` | `POST {path}` | `routes.create` |
| `update` | `PATCH {path}/{id}` | `routes.update`, `method` |
| `updateMany` | `PATCH {path}{routes.updateMany}` with `{ ids, patch }` → `{ updated, failed: [{ id, code }] }`. Only when `routes.updateMany` is set (decision 147). | `routes.updateMany`, `toRecord` |
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

**Built so far (step 12, 2026-11-23), seen in the showcase (/dev/collection and /dev/parts, a second collection linked to the items):**
- A section names a collection and a scope (`collection: () => definition`, `scope: (record) => filters`); it loads the first records as that list does, so "Show all" opens a list already in the cache. A collection's `scopes` show as chips, its `basePath` is where "Show all" goes.
- The view stack is in session storage; a history entry pushed by a drill carries its depth (`drill`), kept when the address changes in place, so the strips show only on a page reached by drilling.
- Linked records open in the panel with tabs (decision 137): the address keeps the chain (`?linked={key}:{id}:{section},…`; the section tells which one when a record has two sections of the same collection, #70).
- Built since (2026-11-23): a section's `context` reaches its list (`SectionDefinition.context`), and `opensAsPage` opens a record people work inside on its own page from a section (a link on the full page); in the showcase, a part of kind Bearing stands for one. Built since (decision 145): a record opened from a section in the panel gets its context from the chain: the record before it in `?linked=` is its parent, and the parent's section gives the context (`useChain` in `record/linked.ts`, which loads the parent first after a refresh). "Show all" and full pages use the linked collection's `basePath` in that context; `opensAsPage(record, context)` gets it too. In the showcase, an item's Checks live inside it (`/dev/collection/{item}/checks`), and their data source refuses any request without the item. Built since: a linked record's More actions (shared record actions, spec 8.3) and, below 1024 px, the top bar's "‹" (decision 128).


- **In the panel:**
  - a section shows its first 5 items;
  - when it has more, "Show all ⤢" shows on the section's title line, on the right (the count is already in the title).
- **"Show all"** navigates (push) to the linked collection's address with a scope filter, for example `/resources?f.linkedTo={parentId}`. The linked collection is any collection with a definition. Its section names it:

  ```ts
  sections: [{ id: 'linked', label: '…', collection: linkedDefinition, scope: (record) => ({ linkedTo: [record.id] }), preview: 5 }]
  ```

- **The scope filter** is a filter like the others, kept in the address. It shows as a chip ("Linked to: {parent name}", with ×) before the Filter menu. A record created in a scoped list gets the parent link from `create.defaults`, which receives the active filters.
- **The strips (the views left behind):**
  - Each drill pushes the view being left onto a **view stack** in session storage. A view is its address and its saved state: scroll position, panel history.
  - Each stacked view shows as a strip, 32 px wide, after the sidebar:
    - a "‹" at the top;
    - the view's name written vertically ("{collection title} · {open record}");
    - the whole strip is one button that returns to that view.
  - Returning to a view takes it and every view after it off the stack, then restores its address: search, filters, sort and open record (panel). The list comes back to the place it was left: its pages are still in the cache, and the bookmark scrolls to the row (8.4).
  - The browser's Back button does the same, one level at a time.
  - **At most 2 strips show.** With more levels, the first strip stands for all the older ones and opens a menu listing them, newest first.
  - **Removing the scope chip** leaves the plain collection, and the strips stay.
- **Width:**
  - the strips take space from the list;
  - in the medium layout (1024–1439 px), the sidebar folds as soon as a strip or a panel is shown;
  - below 1024 px there are no strips, and "‹" goes up one level.
- **Tests (added to 15.4):**
  - "Show all" opens the scoped list with its chip;
  - a strip returns to the previous view with its search, filters, sort and panel;
  - the browser's Back button does the same;
  - a third level folds the older views into the first strip's menu;
  - removing the chip keeps the strips;
  - creating in a scoped list links the new record;
  - creating in a list filtered on one value starts with that value, and a filter with several values sets nothing.

## 13. The full page

**Built so far (step 8):** the page is `{basePath}/{id}` (the `Collection` takes `basePath`, by default `/{definition.key}`). Until activity exists, the right column holds the linked records. Archive and Remove are the collection's actions (`definition.actions`), offered only when `rights.actions` lists them.

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
| Address ↔ state (`useCollectionState`) | Reads and writes search, filter rules (`f.{key}`), sort levels, `open` and `new`; leaves defaults out of the address; restores from session storage when the address is bare; replaces on search, filter and sort, pushes on open and `new` |
| `restSource` | Builds the default routes and parameters; uses overridden routes, parameters, `toPage` and `toRecord`; turns error responses into `ApiError` with the code and field |
| Cache updates (`useCollectionQuery`) | Create adds on top and adds 1 to the total; edit replaces the record in every page; archive and remove take it out and subtract 1 |
| Layout mode | 1440 → wide, 1024 → medium, 1023 → narrow |

### 15.4 Component tests: the archetype as a user sees it

Each line is one test with the test collection and MSW. Together they cover every rule of sections 6 to 10.

| Area | The test checks that… |
|---|---|
| **List** | the first page shows 30 items and the total; scrolling near the end loads the next 30 once; a failed page shows Retry, and Retry loads it; the end of the list loads nothing more |
| **Search and filters** | typing waits 250 ms, then shows only matching items; a filter shows its count on its button; "Clear filters" resets both; no results shows its message |
| **Sort** | clicking a column header sorts through the server and updates the address; a third click goes back to the default order; the last sort is remembered |
| **Panel** | clicking an item opens it, marks it and adds `?open`; clicking another switches; × and the browser's Back both close it and agree; a `404` shows "no longer available", and the item leaves the list |
| **Linked records** | an item of a section opens in the same panel and the record left folds into a tab; a tab opens its record again; × and Back go back one step; a third step folds the older records into the first tab's menu; a linked record with its own page navigates there |
| **Edit in place** | a text field saves when left and with Enter, puts the value back with Escape; a refused or failed change puts the value back and shows its message; a menu value saves on choice and comes back on error; no field shows for a value not in `rights.edit` |
| **Creation** | "New" shows the defaults and "Not saved yet"; filling the name creates the item once; it appears on top, open, with "Record created · Undo"; Undo removes it; leaving with nothing typed asks nothing; leaving with input asks, and Discard creates nothing |
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
  - The component tests use `memorySource`. It and the demo collections come from `collection/testing` (its own entry, never imported by the app); the app shell imports only `collection/confirm` (the confirmation host) and, lazily, `collection/showcase`, so the collection loads with the first screen that uses it (#72).
  - The `restSource` tests use MSW.
- **CI green and the user's review** of the showcase page before merging.

### 17.2 Steps

| # | Step | What is built | Validated by |
|---|---|---|---|
| **0** | Groundwork | Add TanStack Table, TanStack Virtual, react-markdown, remark-gfm. The router learns query strings with push or replace, and marks its own history entries. Test helpers: `testDefinition`, `makeItems`, `memorySource`, layout and `matchMedia` stubs, `renderCollection`. The empty showcase page | Router tests; the existing app unchanged; the showcase page opens |
| **1** | Data layer | `DataSource`, `restSource` with overridable routes, parameters and response mapping, `ApiError`. `useCollectionQuery` (infinite query) and the cache updates (8.3) | Unit tests (15.3): routes, overrides, errors, cache updates |
| **2** | List, first page | `Collection` shell, header with total, the table on TanStack Table, the first-load, empty, no-results and error states | Showcase: 30 items in the table, each state from the switch. Component tests for the list states |
| **3** | Infinite scroll | TanStack Virtual for the rows, loading more near the end, loading row, failed page with Retry | Showcase: scroll through 300 items smoothly; a failing page and Retry. Tests: next page once, Retry |
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

0. **Views other than the table.** The cards view is dropped from the whole application (decided 2026-11-26): the wrapper shows a table, and rows on narrow screens. Other views (kanban, calendar) are designed later.
1. ~~Restoring after a refresh is limited to 5 pages.~~ Replaced by decision 144: one page is loaded, whatever the depth.
2. ~~Session storage is per browser tab.~~ Accepted (2026-11-23): a record opened in a new tab starts from its address only, with no panel history and no remembered scroll.
3. **Later goal: the collection as a public React library** (set 2026-11-23, not scheduled). Intervio becomes one user of it. Decided so far:
   - **Home:** a package in this repository's pnpm workspace (`packages/collection`), published to npm from there.
   - **Look:** it ships today's style as its own compiled `styles.css`, driven by CSS variables the host sets (Intervio sets its tokens).
   - **Audience:** public from the start: semantic versioning (Changesets), public docs (installation, the definition API of section 4, the data source contract), the showcase as a live demo, and only what `index.ts` exports is public.
   - **Ties to cut** (2026-11-23 count): `ui-kit` (36 imports: its Table, List, Menu, pickers, Show/Switch, Icon move into the library), `navigation` (12: a small router adapter, with a React Router one shipped), `notifications` (4) and `http` (7: passed in through a `CollectionProvider`), `i18n` (4: i18next stays a peer dependency, the library ships its English and French texts), the 19 Lucide icons (bundled with their license), and the shell's hooks (sidebar folding, the narrow ‹: passed through the provider). TanStack Query stays a peer dependency.
   - **Phases, one pull request each:** (1) cut the ties in place inside `frontend/`; (2) create the package, build it (Vite library mode: ESM, types, `styles.css`) and switch Intervio to `@…/collection`; (3) the standalone showcase as the demo; (4) README, Changesets, an npm publish job, license.
   - **Still to choose before publishing:** the package name and npm scope, and the license.
