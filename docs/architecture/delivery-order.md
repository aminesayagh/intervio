# Intervio — table dependencies and delivery order

**Date:** 2026-11-18  
**Source:** the schema on `docs/Intervio.excalidraw` and `use-cases.md`.

## 1. Dependency levels

A table's level is one more than the highest level among the tables it **must** reference (its required foreign keys). Level 0 tables reference nothing. Business objects belong to a company, and the company belongs to its owner (decision 67).

| Level | Table | Required references |
|---|---|---|
| **0** | users | — |
| **1** | companies | users (owner) |
| **1** | files | users (uploader) |
| **2** | resources | companies |
| **2** | interventions | companies |
| **3** | invitations | interventions (the user is optional until the account exists) |
| **3** | intervention_documents | interventions, resources |
| **3** | offers | interventions, users (bidder) |
| **3** | chats | interventions, users |
| **3** | notifications | interventions, users |
| **4** | milestones | offers |
| **4** | reports | offers |
| **4** | messages | chats |
| **5** | requests | milestones, resources, users (sender) |
| **5** | acceptance_criteria | milestones |
| **5** | change_requests | milestones |
| **6** | test_items | acceptance_criteria |
| **6** | test_results | acceptance_criteria, users (witness) |
| **6** | bookings | requests, users (provider) |
| **7** | booking_slots | bookings |

### Optional links that close a loop

These nullable foreign keys are filled later in the life of a row, so they do not count for the levels:

| Column | Filled when |
|---|---|
| requests.change_request_id | a change request asks for extra resources (after the contract) |
| acceptance_criteria.witness_request_id | the client assigns a witness (after the award) |
| change_requests.criterion_id, target_milestone_id | the change request moves or waives a criterion |
| companies.logo_file_id | the client adds a logo during onboarding |

`test_results.test_item_id` is also nullable (only acceptance tests have items).

## 2. Delivery order (vertical slices)

Each slice is delivered from start to finish: tables, rules, screens and notifications, so it can be demonstrated on its own. The levels decide the order; the use cases decide what goes in each slice. Use-case numbers refer to the Intervention plan board unless stated.

| # | Slice | New tables | Use cases | Demo at the end |
|---|---|---|---|---|
| 1 | **Accounts and interventions** | companies, users, interventions, resources (documents), files, intervention_documents | Accounts 1–5 · Client board 1, 2 (with scheduling) | A client signs up, describes their company, creates an intervention with its specifications and publishes it. |
| 2 | **Invitations and notifications** | invitations, notifications | Client board 3, 4 · Plan board 1, 2 | Bidders and client staff receive, confirm or decline invitations, and see the specifications. |
| 3 | **Offers and milestones** | offers, milestones | Client board 5 · 6, 7 (without criteria), 10, 11, 12 | Bidders build milestones, submit before the shared deadline, withdraw, or miss it. |
| 4 | **Acceptance criteria** | acceptance_criteria, test_items | 7, 8 | Each milestone carries performance criteria and acceptance tests. |
| 5 | **Resource requests and RFIs** | requests | 4, 5, 9 | Bidders request resources per milestone and submit RFIs on the preparation milestone. |
| 6 | **Review, clarification and award** | — (statuses only) | 13–19, 24 | The client approves or rejects items, sets clarification deadlines, awards and confirms the launch. |
| 7 | **Bookings and witnesses** | bookings, booking_slots | 20–23, 26–31 | The client books slots and assigns providers and witnesses; providers confirm, hand over and get equipment back. |
| 8 | **Execution and test results** | test_results | 25, 32–34, 37 | Witnesses record results; criteria become met or overdue; the client signs off milestones. |
| 9 | **Change requests** | change_requests | 28, 35, 36 | The contractor asks for extra resources, more time, or to move, waive or descope; the client decides. |
| 10 | **Completion and warranty** | reports | 38–42 | The contractor indicates completion; completion and warranty reports export as PDF. |
| 11 | **Chat** | chats, messages | Information board 1, 2 | Bidders and contractors ask the chat for information. |

### Why this order

- **Slices 1–2 come first because everything references them.** Notifications are built early because most later slices send one.
- **Slice 6 adds no table.** It only adds the actions that move offers, criteria and requests between statuses. It closes the call for offers, so the whole first phase can be used end to end after it.
- **Bookings (slice 7) come before execution (slice 8)** because a witness is the provider of a staff-time booking. Execution itself does not wait for bookings, since the contract does not require them.
- **Change requests (slice 9) come after execution** because they change milestones, criteria and requests that must already work.
- **The chat (slice 11) is independent.** It only needs interventions, so it can move earlier or run in parallel if someone else builds it.
- **Sessions and email-link tokens are left to Spring Security** (remember-me cookie, one-time tokens in the framework's own table), so they have no table here.
