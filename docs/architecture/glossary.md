# Intervio — glossary

**Status:** Accepted on 2026-11-17. `use-cases.md` uses these terms.  
**Date:** 2026-11-17  
**Goal:** Use the words that maintenance clients and contractors already use in calls for offers, contracts and acceptance testing.

Mark each row in the **Decision** column: keep the current term, take the proposal, or write your own.

## People

| Current term | Proposed term | Why | Decision |
|---|---|---|---|
| Owner | **Client** | The party that issues the call for offers and accepts the work is called the client in maintenance contracts. "Owner" also clashes with "responsible staff member". | |
| External (in general) | **Contractor** | The usual name for the external company doing the maintenance. | |
| External candidate | **Bidder** | Someone who submits an offer and is competing for the contract. | |
| External maintainer (after contract) | **Contractor** | Once the offer is awarded, the bidder becomes the contractor. | |
| Staff | **Client staff** | Makes clear they belong to the client's side, not the contractor's. | |
| Client staff, on the client's own screens | **Colleague** (the group: **team**) | Seen by the client, "client staff" reads as the staff of the client's own clients. The client invites colleagues to the intervention's team; "client staff" stays the term in these documents and on contractor screens. | Taken (2026-11-21) |
| Responsible staff member (for a resource) | **Resource provider** | Describes the job: they provide and take back the resource. | |
| Tracking staff member (for a metric) | **Witness** | In acceptance testing, the client's representative who observes and records the results is the witness. | |

## Call for offers (planning)

| Current term | Proposed term | Why | Decision |
|---|---|---|---|
| Specifications book | **Specifications** | Standard English term (French: *cahier des charges*). | |
| Plan milestone / planning phase | **Call for offers** (phase) | The phase where bidders prepare offers is a call for offers, not a milestone in the client's eyes. | |
| Plan proposal | **Offer** | What a bidder submits in answer to a call for offers. | |
| Plan deadline | **Offer deadline** | The submission deadline of a call for offers. | |
| Revision deadline | **Clarification deadline** | After review, the client asks bidders to clarify or correct items; this is the clarification round. | |
| Accept a proposal | **Award** the offer | The standard verb for choosing an offer to carry out. The client can award several. | |
| (new) | **Validated** offer | A submitted offer whose items are all approved; it can be awarded now, later, or declined. | |
| (new) | **Preparation milestone** | The first milestone of each offer, where the bidder submits RFIs. | |
| Rejected / excluded candidate | **Not retained** | Neutral wording used when a bidder is not selected or misses a deadline. | |
| Contracted | **Contract signed** (or **Awarded**) | Says what happened: the client approved the offer and its resources. | |
| Delivery deadline | **Completion date** | The contractual date by which the work must be complete. | |

## Execution

| Current term | Proposed term | Why | Decision |
|---|---|---|---|
| Work milestone | **Milestone** | Already a business term; FAT and SAT can be two milestones. | |
| Metric | **Acceptance criterion** | The condition that must be met for the client to accept the work. | |
| Numeric metric | **Performance criterion** (KPI) | A measured value tracked over time, such as output or downtime. | |
| Checklist metric | **Acceptance test** | A list of test items, each passed or failed. | |
| Checklist item | **Test item** | One line of an acceptance test. | |
| Measurement method | **Test procedure** | How the criterion is measured or the test is run. | |
| Measurement | **Test result** (or **reading** for numeric) | What the witness records. | |
| Required / nice to have | **Mandatory / optional** | Standard wording in specifications. | |
| Metric valid | **Criterion met** | Plain wording for the end state. | |
| Late (metric or intervention) | **Overdue** | Common wording for something past its due date. | |
| Owner closes the milestone | **Sign-off** | The client signs off a milestone once its criteria are met. | |
| Abandoned milestone | **Descoped milestone** | Contract wording for work removed from scope. | |

## Resources

| Current term | Proposed term | Why | Decision |
|---|---|---|---|
| Resource | **Client-furnished resource** | In contracts, what the client provides to the contractor is "client-furnished". | |
| Material | **Equipment** | Tools, spare parts or devices lent to the contractor. | |
| Physical access | **Site access** | Access to a site, area or department. | |
| Staff working time | **Staff time** | Hours of client staff assigned to help the contractor. | |
| Documents | **Documents** | Keep. | |
| Reservation | **Booking** | Plain wording for holding a resource; a booking is a set of time slots. | |
| Resource provided / returned | **Handed over / returned** | Matches how equipment is passed on site. | |

## Changes and completion

| Current term | Proposed term | Why | Decision |
|---|---|---|---|
| Blockage (during the call for offers) | **Request for information (RFI)** | A resource request on the preparation milestone, limited to a document or a site visit. Before the contract there is no agreed offer to change. | |
| Blockage (after the contract) | **Change request** | Every one asks the client to change something (time, resources, criteria, scope). | |
| Extra time (blockage option) | **Extension of time** | The standard contract term (often "EOT"). | |
| Close a metric (blockage option) | **Waive a criterion** | The client agrees the criterion no longer has to be met. | |
| Complete (the intervention) | **Completion** | Keep. | |
| Final report | **Completion report** | The report issued at the end of the work. | |
| Follow-up milestone | **Warranty period** | In maintenance, the period after completion where results are still monitored. | |
| Follow-up report | **Warranty report** | The report issued at the end of the warranty period. | |

## Terms to keep

| Term | Why |
|---|---|
| **Intervention** | It is the product name (Intervio) and a common word in maintenance. |
| **Milestone** | Already business language. |
| **Client board, Intervention plan board, Information board** | Screen names, not business objects. "Owner board" became "Client board" to match the new role name; the others can be renamed during wireframing. |

## Interface language

English and French (decision 57 in `use-cases.md`). The French terms still have to be added to this glossary.
