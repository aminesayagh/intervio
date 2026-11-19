# Intervio — use cases

**Status:** Current version  
**Date:** 2026-11-17  
**Sources:** the first wireframing brief (removed), edits made on the Excalidraw board, and the decisions below.  
**Terminology:** follows `glossary.md`.

## 1. Decisions taken

### Scope of the first version

1. **One client per intervention, and one or several awarded offers.** During the call for offers, several bidders compete (see decisions 8–16). The client can award one offer or several; each awarded offer has its own contractor, contract, milestones and reports. The contractor manages their own work in their own tool; Intervio does not track their tasks.
2. **Notifications are shown in the application only.**
3. **Things settled outside the platform are not tracked on it**, as long as they do not block the workflow. Users are not asked to record them.
4. **Messaging between users is out of scope.** People contact each other outside the platform.
5. **The chat is for bidders and contractors only.**

### Call for offers

6. **The intervention has two phases: the call for offers, then execution.** Execution runs separately for each awarded offer.
7. **The specifications are a PDF.** They cannot change once shared. They are shared with all bidders, together with any other shared documents, without a request.
8. **There are two kinds of deadline:**
   - the **offer deadline** is set by the client when creating the intervention and is **shared by all bidders**, so every offer is compared on equal terms. When the client extends it, the extension applies to all bidders;
   - the **clarification deadline** is set by the client **for one offer**, when sending rejected items back to its bidder. It can be extended for that offer only.
9. **The client can invite several contractors as bidders.** Each bidder builds their own offer from the specifications. Bidders do not see each other's offers.
10. **Each offer starts with a preparation milestone**, created automatically. It is where the bidder submits requests for information (see decision 48). It has no acceptance criteria and no sign-off, and it closes when the offer is awarded, not retained or withdrawn.
11. **Each bidder builds their offer freely, then submits it before the offer deadline.** Once submitted, the bidder waits and cannot edit it. A bidder who has not submitted by the offer deadline is not retained.
12. **After the offer deadline, the client reviews every submitted offer.** There is no shortlist: a resubmitted offer comes back into the same review list, so the client never misses an update.
13. **The client reviews each item of a submitted offer**: its milestones and timeline, its acceptance criteria and its resource requests. Each item is approved, or rejected with a reason. Rejected items go back to the bidder with a clarification deadline; the bidder edits them and submits the offer again. Without an extension, a bidder who has not resubmitted by then is not retained. An offer the client is still reviewing stays in the running. Once every item is approved, the offer is **validated** (computed, not stored).
14. **The client decides which validated offers to award, and when.** The client can award one offer, award several in parallel and keep the best result, or award one and keep another validated offer waiting until the first one's results are known. A waiting offer can be awarded later or declined; a declined offer is not retained. When an offer is awarded, its bidder becomes the contractor for that offer.
15. **Bidders who are not retained simply lose access to the intervention.** No reason is given.
16. **A bidder can withdraw their offer at any time before it is awarded.** A withdrawn bidder loses access to the intervention, like one who is not retained. The client is notified and can invite another contractor.

### Contract and execution (for each awarded offer)

17. **Resources are booked only for awarded offers.** While reviewing offers, the client checks availability but books nothing; bookings and witnesses can be assigned once an offer is awarded, before or after the contract. The exception is a request for information on the preparation milestone: an accepted one is handed over right away.
18. **Contract signed** is the status an awarded offer reaches when the client confirms its launch. Execution starts only after this confirmation. Booking resources is not required first: the client can book them later, or settle a resource outside the platform (by phone, or by giving the contractor direct access). The platform never blocks the client for an unbooked resource; status updates entered by hand are how it learns about changes. The contractor does not approve the contract separately, because the contractor wrote the offer from the specifications.
19. **The completion date comes from the bidder.** Each bidder specifies their completion date in their offer. It is confirmed when the contract is signed.
20. **Pausing and cancelling are not supported.** After the contract, every change goes through a **change request** from the contractor.
21. **A delay must be explained by a change request.** If the completion date passes and no change request has been made, the board shows the offer as overdue and encourages the contractor to submit the change request they need.
22. **The contractor indicates completion**, which is only possible once every milestone of their offer is signed off or descoped.
23. **The client does not decline the outcome.** The expected results were agreed as acceptance criteria in the offer, so there is no separate acceptance step.
24. **Each completed offer produces a completion report.** The client and the contractor can view it and export it as a PDF. Stopping a stalled offer or replacing a contractor is outside the first version.

### Participants

25. **Invitations can be confirmed or declined** by bidders and by client staff. When someone declines, the client can invite someone else.

### Milestones and acceptance criteria

26. **A milestone is one of three kinds**: the **preparation** milestone (decision 10), **execution** milestones, and the **warranty period**.
27. **An execution milestone is a group of resources used to meet a set of acceptance criteria.** Milestones are independent: one does not block another, and several can be in progress at the same time. FAT and SAT, for example, can be two milestones.
28. **The contractor is the expert and proposes the acceptance criteria.** For each criterion, the contractor defines:
    - a **kind**: a **performance criterion** (a value tracked over time) or an **acceptance test** (a list of test items, each passed or failed, for example every alarm on the approved alarm list appears on the HMI and can be acknowledged);
    - a **test procedure**: how the witness must measure the criterion or run the test, so that the result cannot be disputed;
    - for a performance criterion, a **unit**, a **starting value** and a **target value**, and whether the value must **increase or decrease** to get there;
    - for an acceptance test, its **test items**;
    - a **tracking frequency**;
    - an **overdue threshold**: how long without a test result before the criterion counts as overdue;
    - for a performance criterion, a **success condition**: reaching the target once, or reaching it on a number of consecutive readings (for example, above 10,000 on 30 daily readings in a row, meaning one month);
    - whether it is **mandatory** or **optional**.
29. **During clarification, the client approves each acceptance criterion or rejects it with a reason.** Once an offer is awarded, the client assigns a witness to each approved criterion through a staff-time request: the witness is that request's resource provider. One witness can cover several criteria.
30. **The witness records test results at the required frequency** until the criterion is met. The contractor can request an update from them.
31. **A criterion is met when its success condition is reached.** With a single-time condition, the first reading that reaches the target meets it. With a consecutive condition, a reading that misses the target restarts the count. An acceptance test is met when every test item has passed; a failed item is tested again until it passes. Once met, a criterion stays met.
32. **An overdue criterion blocks nothing.** The board shows it as overdue, and following up with the witness is the client's responsibility.
33. **A milestone can be signed off only when all its mandatory criteria are met.** Optional criteria do not block sign-off. The client is asked to confirm, and the client signs off the milestone.
34. **The client can waive a criterion** when the resource it needs cannot be provided.

### Warranty period

35. **The warranty period is planned as a milestone.** In the offer, the bidder proposes its duration after completion, for example one year. The warranty period has its own acceptance criteria and its own resources to track them.
36. **The warranty period starts at completion and has its own warranty report.** It does not block the completion report.

### Client-furnished resources

37. **A client-furnished resource (resource, for short) is one of four types**, and each is handed over by a client staff member:
    - **Equipment**, handed over to the contractor and returned when its booking ends;
    - **Site access** to a site, area or department, to investigate or to work;
    - **Staff time** of a client staff member;
    - **A document.**
38. **Every resource request belongs to a milestone.** Requests on execution and warranty milestones are reviewed during clarification, booked when the client chooses (or settled outside the platform), and handed over once the milestone starts. If one is not handed over, the contractor can submit a change request.
39. **Every booking has a resource provider.** For each accepted request, the client assigns the client staff member who provides it. Once they confirm, they hand over the resource on time. The contractor sees who the resource provider is and can remind them outside the platform.
40. **Every resource has an availability calendar and a quantity.** The calendar is built from the bookings made on the platform; nobody maintains it by hand.
41. **The resource provider is the safety net for availability.** The calendar may not match reality, so every booking must be confirmed by the resource provider. A human in the loop closes the gap between the data and reality.
42. **Availability is the client's concern, not the contractor's.** When a booking is declined, the contractor simply keeps waiting. The client is informed and either finds another resource or other slots, removes the criterion that needs the resource, or rejects the request with a reason, such as "unavailable". The contractor only sees the reason the client picks; a rejected request is not followed up on the platform.
43. **A booking is a set of time slots**, for example weekdays from 9:00 to 11:00 for three weeks, plus one Saturday from 14:00 to 18:00. All slots sit inside the milestone's timeline. The client can enter them as a repeating pattern with exceptions; each slot is stored on its own.
44. **The contractor always goes through a resource provider.** The contractor cannot fetch equipment themselves. The resource provider's record of handing over (and, for equipment, getting back) the resource is enough; the contractor does not confirm it.
45. **Staff-time resources = staff invitations.** When the client assigns a staff member's time, that person gets the same invitation as directly invited client staff. When their booking ends, the client is notified and releases them from the milestone.
46. **Client staff on a milestone** have one of three purposes: resource provider, staff time, or witness.

### Requests for information and change requests

47. **A change request is how the contractor asks for anything outside the agreed offer.** It is the only way to change an offer once the contract is signed. The contractor submits one or several change requests at once on a milestone, describes each, and requests one of these options:
    - extra resources (equipment, site access, staff time or a document);
    - an extension of time (a later date);
    - moving a criterion to another milestone, together with its test results and its witness;
    - waiving a criterion;
    - descoping the milestone.

    The client accepts or rejects each change request individually. When one is accepted, the milestone is updated accordingly. Extra resources follow the same process as any resource.
48. **During the call for offers, a bidder asks for what they need through a request for information (RFI).** An RFI is a resource request on the offer's preparation milestone, limited to a document or a site visit needed to prepare the offer. The client accepts or rejects each RFI, and an accepted one is handed over right away by a resource provider. Other bidders do not see it.

### Accounts

49. **Only clients sign up from the public page.** Bidders and client staff create their account from their invitation link; the email is filled in from the invitation and cannot be changed. Continuing with a Google account whose email differs from the invited one is refused, with a message naming the invited email.
50. **Three ways to sign up and log in:** Google, a sign-in link sent by email (no password), or email and password. A sign-in link is valid for 15 minutes and works once.
51. **Sign-up asks only for the full name and the work email** (plus a password when that way is chosen). Information about the company is collected later, during onboarding.
52. **The email must be confirmed before the account is active.** With email and password, the user opens a confirmation link sent by email. A Google account or a sign-in link already proves the email.
53. **A password has at least 12 characters.**
54. **Log in offers "Remember me",** which keeps the user logged in for 30 days. Without it, the session ends when the browser closes.
55. **Forgot password:** the user enters their email; the screen always answers "If an account exists for this email, we have sent a reset link", so it never reveals who has an account. The link is valid for 1 hour and leads to a screen where the user sets a new password; saving it logs the user in directly.
56. **Terms and privacy are shown as one line under the sign-up button**, with links to the terms of use and the privacy policy, and no checkbox. It cannot be dropped: data protection law (GDPR) requires informing users when their data is collected.
57. **The interface is in English and French.** The public screens (accounts, onboarding) have a header with the logo on the left and, on the right, a language switcher (EN / FR) and a light and dark mode switch. Where these switches go on signed-in screens is to be defined. On the first visit, the language follows the browser (French if it is French, English otherwise) and the mode follows the computer setting; the user's choices are then remembered.

68. **Google with an email that already has an account:** the accounts are linked only when Google marks the email as verified. If the existing account's email was not confirmed yet, it is confirmed and its password is removed.
69. **The email confirmation link is valid for 24 hours** and works once.
70. **Attempt limits:** after 5 failed log-in attempts in a row for an email, log in with a password is blocked for 15 minutes. Each email link can be requested at most once per minute and 5 times per hour.
71. **"Use another email" on the "Check your email" screen goes to the log in screen.**
72. **Sign-up with a password asks for it twice** (password and confirmation).
73. **Logging in with a password before confirming the email is refused, and a new confirmation link is sent.**

### Onboarding

58. **After confirming the email, the client describes their company:** company name and registration number (required), industries (several choices, optional) and logo (optional).
59. **The registered address is not asked during onboarding.** Companies can be anywhere in the world, so the address is asked when the client creates their first intervention.
60. **The client's job title is not collected.**
61. **Onboarding has three steps:** company (name, country of registration, registration number), industries, then logo. Only the first step is required; the client can skip the other two, and the client board opens at the end.
62. **Industries:** Manufacturing, Energy and utilities, Oil and gas, Chemicals, Pharmaceuticals, Food and beverage, Automotive, Aerospace, Mining, Water and wastewater, Building and facilities, Transport and logistics, Healthcare, Other.
63. **Logo:** PNG or JPG, up to 2 MB.
64. **Contractors and client staff do not describe a company.**
65. **One client account per company.** Intervio serves several companies, each kept separate. Each company records the user who owns it, so a user can own several companies later without a change to the data model.

### Client board

66. **The client board fills the full width of the browser.** A sidebar on the left holds the logo at the top, then a "Main" section with two tabs: Dashboard, and Resources, which lists all the resources of the company, and the "Manage profile" button at the bottom. The rest of the sidebar is to be defined.

### Data ownership

67. **Business objects belong to a company, and the company belongs to its owner.** Interventions and resources reference the company, not the user, so that a user can later own several companies. Client staff reach an intervention through their invitation only.

### Files

74. **One upload module for every file** (logos, specifications, shared documents, RFI and change-request documents, reports). A file is uploaded first, then attached to a business record by its id; a file not attached within a day is deleted.
75. **Accepted formats:** PDF, PNG, JPG/JPEG, Excel (.xlsx, .xls), CSV and Office files (.docx, .doc, .pptx, .ppt). The type is recognized from the file's content, never from its name. Office files containing macros are refused.
76. **Size limits:** 10 MB for documents, 2 MB for a company logo (decision 63). Images are rebuilt without their metadata and limited to 2000 × 2000 pixels for a logo.
77. **Every upload is scanned for viruses** (ClamAV, run locally). An infected file is refused and never stored; if the scanner is unavailable, the upload is refused.
78. **Files are stored on the local disk** (`storage/` at the repository root, never in git), under random names, and are never served directly.
79. **Reading a file requires a logged-in user allowed to see that particular file**: the uploader, and the people of the record it belongs to (for a logo, its company). Documents download as attachments; only images are shown in the page.
80. **The country of registration lists only places with their own company register.** Territories whose companies register in another country's register are left out: the French overseas regions and collectivities (French Guiana, Guadeloupe, Martinique, Réunion, Mayotte, Saint Barthélemy, Saint Martin, Saint Pierre and Miquelon) register in France, Åland in Finland, Greenland in Denmark, Svalbard in Norway, the Caribbean Netherlands in the Netherlands, and Christmas, Cocos and Norfolk islands in Australia. Uninhabited territories are left out too. Each country is shown with its flag.
81. **The "Manage profile" button at the bottom of the sidebar shows the user's name and email and opens a menu:** Manage profile (its page comes later), Language (EN / FR), Theme (light / dark) and Log out. Signed-in screens have no header, so this menu is where these settings live.
82. **Each client board tab has its own address:** /dashboard and /resources. The address "/" sends a logged-in client to the dashboard (after logging in and after onboarding) and a logged-out visitor to log in; an unknown address does the same.
83. **Until interventions and resources are built, the Dashboard and Resources pages show only their title.**
84. **Below 1024 px wide, the sidebar hides behind a menu button at the top left** and slides in over the page; choosing a tab closes it.
85. **The client can collapse the sidebar** with the sidebar button at its top right. Collapsed, it is 57 px wide and keeps the logo at the top (it becomes the button that opens the sidebar again, shown as the sidebar icon on hover), the tab icons (their names show on hover) and the profile initial, which still opens the profile menu. The choice is remembered on that browser. On narrow screens the button closes the drawer.

### Settings

86. **"Manage profile" opens the Settings page inside the client board** (the sidebar stays). Its tabs are a vertical list on the left, in two groups: Account, with Profile (/settings/profile) and Security (/settings/security); and Companies, with one tab per company the user owns, named after it (/settings/companies/{company id}), so a user with several companies manages each one in its own tab. An "Add a company" button closes the Companies list; for now it opens a dialog saying that managing several companies is not available yet.
87. **Profile:** a photo (PNG or JPEG, up to 2 MB, through the upload module), which replaces the initial in the sidebar and can be removed; without an uploaded photo, the photo of a connected Google account is shown; the full name; the work email; and the preferences: language (English or French) and theme (light or dark), the same choices as in the sidebar menu, applied at once.
88. **Changing the email needs confirmation.** The new address receives a confirmation link valid for 24 hours; the current address keeps working until then and receives a notice that the email is changing. If Google sign-in is connected with the old address, it is disconnected when the new address is confirmed.
89. **Security:** change the password (current password, then the new one twice, at least 12 characters); a user without a password (Google or sign-in link) sees "Set a password" instead, without the current password. Sign-in methods show Google as connected or not connected, read-only for now. "Log out of other devices" ends every other session, including "Remember me", and keeps the current one.
90. **An account can be deleted only while its company has no published intervention.** Deleting removes the account, the company, its logo and its files for good, after the user types their email to confirm. Once an intervention is published, the section explains that the account cannot be deleted.
91. **Each company tab:** the onboarding fields (company name, country of registration, registration number, industries, logo), editable with the same rules as in onboarding.

### Interventions on the client board

92. **The sidebar lists the interventions under "Main":** the six the user opened last, most recent first, remembered on the server so the list follows the user from one device to another. When the company has more than six interventions, a seventh entry, "All interventions", opens the gallery. Below the list, a "Create an intervention" button is always shown. In the collapsed sidebar only the create button stays, as a "+" icon.
93. **"All interventions" is a gallery of cards**, most recently updated first. Each card shows the title, the status (Draft or Published), the offer deadline and the number of documents, and opens the intervention.
94. **"Create an intervention" opens its own page** (/interventions/new) with a short form: title, short description, specifications (files, through the upload module) and the offer deadline. For the company's first intervention, the form also asks the company's registered address (street, city, postal code; the country is the country of registration). The form creates a draft and opens its Overview; shared documents and publishing come later.
95. **Each intervention has its own page** (/interventions/{id}): its title, then horizontal subtabs. The first is Overview: status, offer deadline, description, specifications and, for a draft, the Publish button. More subtabs come later.

## 2. Use cases

### Accounts

1. Client signs up with Google, a sign-in link, or email and password, then confirms the email when needed.
2. Bidder or client staff member creates an account from an invitation link.
3. Any user logs in with Google, a sign-in link, or email and password.
4. Any user resets a forgotten password from a link sent by email.
5. Client describes their company right after confirming the email (onboarding).

### Client board

1. Client and client staff view the list of interventions.
2. Client creates or schedules an intervention from the specifications, adds any shared documents, and sets the offer deadline.
3. Client invites one or several contractors as bidders for an intervention.
4. Client invites client staff to an intervention.
5. Client extends the offer deadline for all bidders, or the clarification deadline of one offer.

### Intervention plan board

**Call for offers (before contract)**

1. Bidders and invited client staff confirm or decline their invitations; when someone declines, the client can invite someone else.
2. Client shares the specifications (PDF), the shared documents and the offer deadline with the bidders.
3. Each bidder studies the specifications and uses the chat to find the information needed to prepare the offer.
4. A bidder submits a request for information (RFI) on their preparation milestone, to get a document or a site visit needed to prepare the offer.
5. Client accepts or rejects each RFI; an accepted one is handed over right away by a resource provider, who confirms it as in use cases 21–23.
6. Bidder sets their completion date, and creates and edits execution milestones and their start and end dates.
7. Bidder plans the warranty period as a milestone: its duration after completion (for example one year), its acceptance criteria, and the resources needed to track them.
8. Bidder proposes each milestone's acceptance criteria: kind (performance criterion or acceptance test), test procedure, and for a performance criterion its unit, starting and target values, direction (increase or decrease), tracking frequency, overdue threshold, success condition (target reached once, or on a number of consecutive readings), and for an acceptance test its test items; and whether the criterion is mandatory or optional.
9. Bidder requests resources for each milestone: equipment, site access, staff time, or a document.
10. Bidder submits their offer before the offer deadline; once submitted, the bidder waits and cannot edit it.
11. A bidder withdraws their offer at any time before it is awarded; they lose access, and the client is notified.
12. Bidders who have not submitted by the offer deadline, without an extension, are not retained and lose access to the intervention.
13. After the offer deadline, the client reviews each submitted offer; a resubmitted offer comes back into the same list.
14. Client approves or rejects each milestone and its timeline, with a reason.
15. Client approves each acceptance criterion or rejects it with a reason.
16. Client accepts or rejects each resource request, after checking the resource's availability calendar and quantity; a rejection gives a reason, such as unavailable, schedule or budget.
17. When items are rejected, the client sets the offer's clarification deadline and the offer goes back to the bidder, who edits them and submits it again; without an extension, a bidder who misses the deadline is not retained.
18. When every item is approved, the offer is validated.
19. Client awards one or several validated offers, now or later, or declines a validated offer; each awarded bidder becomes a contractor, and declined bidders are not retained and lose access.
20. Client assigns a witness to each approved acceptance criterion of an awarded offer, through a staff-time request.
21. For each accepted resource request of an awarded offer, now or later, the client records its booking slots (within the milestone timeline) and assigns the resource provider.
22. The resource provider confirms or declines the booking.
23. When a booking is declined, the client is informed while the contractor keeps waiting. The client then assigns another resource or other slots, removes the criterion that needs the resource, or rejects the request with a reason.
24. Client confirms the launch of an awarded offer; the contract is signed and the completion date is confirmed. Resources not yet booked can be booked later, or settled outside the platform.

**Execution (after contract, for each awarded offer)**

25. Contractor changes a milestone from draft to in progress; several milestones can be in progress at the same time.
26. Client staff open the intervention board and see the milestones they are involved in, the resources they must hand over with their slots and statuses, and the criteria they witness, with the next one due first.
27. The resource provider hands over the resource on time and updates its status: hands over the equipment, opens the site access, starts the staff time, or shares the document.
28. When a resource is not handed over on time, the board shows it as overdue, and the contractor is notified so they can submit a change request.
29. Contractor sees the resource provider for each resource, and can remind them outside the platform.
30. The resource provider gets equipment back at the end of its booking and records the return.
31. When a staff-time booking ends, the client is notified and releases the client staff member from the milestone.
32. The witness records test results at the required frequency, following the test procedure, until the criterion is met: a reading for a performance criterion, or a pass or fail result per test item for an acceptance test.
33. The board shows criteria that have passed their overdue threshold; the client follows up with the witness.
34. Contractor requests an update from the witness, who receives it as a notification.
35. Contractor submits one or several change requests on a milestone; each describes the problem and requests one option: extra resources, an extension of time, moving a criterion, waiving a criterion, or descoping the milestone.
36. Client reviews each change request and accepts or rejects it individually; when one is accepted, the milestone is updated accordingly. Extra resources follow use cases 21–23.
37. When the completion date passes and no change request has been made, the board shows the offer as overdue and encourages the contractor to submit a change request.
38. When all mandatory criteria of a milestone are met, the client receives a sign-off request and signs off the milestone. A milestone cannot be signed off before that.
39. Once every milestone of the offer is signed off or descoped, the contractor indicates completion; the client is notified.
40. The client and the contractor view the completion report and export it as a PDF.

**Warranty period (after completion)**

41. The planned warranty period starts at completion and runs for its duration, with its criteria recorded by the assigned witnesses.
42. At the end of the warranty period, the client and the contractor view the warranty report and export it as a PDF.

### Information board

Saved documents, linking them to milestones and multiple chats are deferred; see `deferred-features.md`.


1. Bidder or contractor opens a chat (bidders and contractors only) to ask for information about the intervention: site or project information from the documents, or the offer's progress on the platform.
2. When the chat cannot provide a needed document, the bidder submits an RFI (Plan board use case 4), or the contractor submits a change request on the relevant milestone (Plan board use case 35).

## 3. Intervention and offer lifecycles

Rule: a status is stored only when a person's action sets it. Anything decided by the clock or by other records is computed when it is read, so extending a deadline never requires updating rows.

```
Intervention (computed, nothing stored)
scheduled         not yet published
call for offers   published, before the offer deadline
review            after the offer deadline, no contract signed yet
in progress       at least one offer has its contract signed
closed            every awarded offer completed, no validated offer waiting

Offer (stored statuses)
in preparation ──(bidder submits before the offer deadline)──▶ submitted
submitted ──(client rejects items, sets the clarification deadline)──▶ in clarification ──(bidder resubmits)──▶ submitted
submitted ──(client awards it, now or later; every item must be approved)──▶ awarded ──(client confirms the launch; bookings not required)──▶ contract signed
submitted ──(client declines it)──▶ not retained
contract signed ──(all milestones signed off or descoped; contractor indicates completion)──▶ completed (completion report, PDF export)
completed ──▶ warranty period runs for its planned duration ──▶ warranty report
any state before awarded ──(bidder withdraws)──▶ withdrawn; client notified

Offer (computed, never stored)
missed deadline   in preparation after the offer deadline, or in clarification after its clarification deadline;
                  treated as not retained (no access). Extending the deadline brings the offer back automatically.
validated         submitted, after the offer deadline, with every item approved; ready to be awarded or left waiting
overdue           contract signed, completion date passed, no change request
```

## 4. Milestone lifecycle

```
Preparation milestone (one per offer, created with it)
open ──(bidder submits RFIs; client answers each; accepted ones handed over right away)──▶ open
open ──(offer awarded, not retained or withdrawn)──▶ closed

Execution milestone and warranty period (stored: draft, in progress, signed off, descoped)
draft ──(contractor starts)──▶ in progress            (milestones are independent; several can run at once)
in progress ──(client accepts a "descope the milestone" change request)──▶ descoped
in progress ──(client signs off; all mandatory criteria must be met)──▶ signed off

Computed, never stored
change requested    in progress with at least one change request waiting for the client
awaiting sign-off   in progress with every mandatory criterion met
```

## 5. Acceptance criterion lifecycle

```
Stored: proposed, rejected, approved, waived
proposed by bidder ──(client rejects, with a reason)──▶ rejected ──(bidder edits)──▶ proposed
proposed ──(client approves)──▶ approved
approved ──(accepted change request)──▶ moved to another milestone (with test results and witness); status unchanged
any state ──(client accepts a "waive" change request, or removes it because its resource is unavailable)──▶ waived

Computed from the offer, the milestone and the test results, never stored
tracking   approved, contract signed, milestone in progress, not met yet
met        success condition reached once in the test history (target reached once, or on N consecutive readings;
           for an acceptance test, every item passed); once met, later readings do not change it
overdue    tracking, and no test result within the overdue threshold (blocks nothing; client follows up)
```

## 6. Resource request and booking lifecycles

```
Resource request (stored: requested, accepted, rejected)
requested (in the offer, as an RFI, or through a change request) ──(client rejects, with a reason)──▶ rejected ──(edited by bidder or contractor)──▶ requested
requested ──(client checks calendar and accepts)──▶ accepted
accepted ──(offer awarded, or right away for an RFI)──▶ client creates a booking
dropped (computed)   accepted, but its offer is not retained or withdrawn

Booking (one or several per request; a declined booking is replaced by a new one)
awaiting confirmation ──(resource provider confirms)──▶ confirmed ──(resource provider hands it over)──▶ handed over
handed over ──(equipment only, end of booking)──▶ returned
awaiting confirmation ──(resource provider declines)──▶ declined; client creates a new booking, removes the criterion, or rejects the request with a reason
confirmed ──(not handed over on time)──▶ shown as overdue; contractor notified
```

The status names in sections 3 to 6 are the agreed names.

## 7. Attributes affected

| Object | Attributes |
|---|---|
| **Intervention** | Title, client, specifications and shared documents, publication date, offer deadline (shared by all bidders), status computed from the publication date, the offer deadline and the offers (scheduled, call for offers, review, in progress, closed) |
| **Invitation** | Email, invited user (once they have an account), intervention, role (bidder or client staff), status (pending, confirmed, declined, expired), expiry date |
| **Offer** | Intervention, bidder, clarification deadline (once items are sent back), completion date, warranty duration, status (in preparation, submitted, in clarification, awarded, contract signed, completed, not retained, withdrawn; "missed deadline", "validated" and "overdue" are computed), submission date, response date, contract date |
| **Milestone** | Offer, title, kind (preparation, execution or warranty period), expected and actual start and end dates, status |
| **Acceptance criterion** | Milestone, description, kind (performance criterion or acceptance test), test procedure, test items (acceptance test only), unit, starting value, target value, direction (increase or decrease), tracking frequency, overdue threshold, success condition (number of consecutive readings on target; 1 = single time), priority (mandatory or optional), status, rejection reason, witness (through a staff-time request), date met |
| **Test result** | Acceptance criterion, reading (performance criterion) or test item with its result (pass or fail), date, witness who recorded it |
| **Resource** | Type (equipment, site access, staff time, document), name, quantity, availability calendar (built from bookings) |
| **Resource request** | Milestone, resource, quantity, change request (if it came from one), status, rejection reason (for example, unavailable) |
| **Booking** | Resource request, resource provider, time slots, status, handover date, return date |
| **Change request** | Milestone, description, requested option (extra resources, extension of time, move a criterion, waive a criterion, descope the milestone) with its details, status, client's reason when rejecting |
| **Report** | Offer, kind (completion or warranty), milestones (signed off or descoped), criterion history, change requests, resources used, completion date compared with the actual completion date; visible to the client and the contractor; PDF export |

## 8. Open questions

No open questions remain for the use cases.

### Parked (not important for now)

- Whether the contractor keeps access after the warranty period ends.
- Whether witnesses record test results on a phone, on site.
