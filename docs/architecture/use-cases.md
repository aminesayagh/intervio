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
7. **The specifications are PDFs.** They cannot change once shared. Every bidder sees them without a request. The intervention's other documents are not shown to bidders: a bidder gets one only through a request on a milestone (decision 104).
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

37. **A client-furnished resource (resource, for short) is one of four types.** Equipment, site access and staff time are handed over by a client staff member through a booking; a document is shared (decision 101):
    - **Equipment**, handed over to the contractor and returned when its booking ends;
    - **Site access** to a site, area or department, to investigate or to work;
    - **Staff time** of a client staff member;
    - **A document.**
38. **Every resource request belongs to a milestone.** Requests on execution and warranty milestones are reviewed during clarification, booked when the client chooses (or settled outside the platform), and handed over once the milestone starts. If one is not handed over, the contractor can submit a change request.
39. **Every booking has a resource provider.** For each accepted request, the client assigns the client staff member who provides it. Once they confirm, they hand over the resource on time. The contractor sees who the resource provider is and can remind them outside the platform.
40. **Every resource except a document has an availability calendar and a quantity.** The calendar is built from the bookings made on the platform; nobody maintains it by hand. A document has neither: it can be shared with any number of people at the same time.
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
48. **During the call for offers, a bidder asks for what they need through a request for information (RFI).** An RFI is a resource request on the offer's preparation milestone, limited to a document or a site visit needed to prepare the offer. The client accepts or rejects each RFI. An accepted document is shared with that bidder as described in decision 101; an accepted site visit is booked and handed over right away by a resource provider. Other bidders do not see it.

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
93. **"All interventions" shows the company's interventions as cards or as a table**, most recently updated first; the choice of view is remembered on that browser. Above the list, a search field filters by title; the header shows the total ("24 interventions"), and more interventions load as the user scrolls (decision 110). A card shows the company name, then the intervention title, with the company logo on the right; then the offer deadline, the next step (the current step of the Steps card, decision 100), and at the bottom the status chip and the avatars of the team. The table has the columns Title (with the company name and logo), Status, Next step, Team, Offer deadline and Last updated, and sorts on Title, Status and the two dates. Each card or row opens the intervention.
94. **"Create an intervention" opens its own page** (/interventions/new) with a short form: title, short description, resources (files, through the upload module; each is a document resource of type "Specification") and the offer deadline. For the company's first intervention, the form also asks the company's registered address (street, city, postal code; the country is the country of registration). The form creates a draft and opens its Overview; shared documents and publishing come later.
95. **Each intervention has its own page** (/interventions/{id}): its title, then horizontal subtabs. Overview shows the status (a chip: Draft or Published), the offer deadline and the description, with the Publish button for a draft. Resources (/interventions/{id}/resources) lists the intervention's resources, each with a chip for its type; documents are the only resources for now. Clicking a PDF opens it in a drawer from the right that shows only its pages. Team (/interventions/{id}/team) manages the intervention team (decisions 96–99). More subtabs come later.
96. **Each intervention has a team of client staff**, invited by the client to help prepare and run it. The client can invite them at any time, including while the intervention is a draft, and the invitation email is sent at once. On screens the client sees, client staff are called **colleagues** and the group is **the team** (see the glossary). The Team tab lists the client first, with the chip Organizer, then each colleague invited, with a status chip: Confirmed, Pending (with the expiry date), Expired or Declined.
97. **"Invite colleagues" opens a modal** that takes one or several work emails and an optional message, sent with the invitation. Each invitation is valid for 7 days.
98. **Team actions:** the client can cancel a pending invitation (its link stops working), resend an expired one (a new link, valid for 7 days again), invite again someone who declined, and remove a confirmed member, who loses access to the intervention at once.
99. **Avatars on "All interventions" show confirmed members only:** up to three, then "+N". Pending invitations appear only in the Team tab.
100. **The Overview tab has two columns.** On the left, a box with the status, the offer deadline, the description and the Publish button for a draft; below it, a Team box listing up to six invited colleagues with their status, and a "Manage team" button that opens the Team tab. On the right, a Steps card shows a vertical stepper of the stages the client goes through to complete the intervention; each stage has sub-steps, shown only for the current stage. The list of stages is a first proposal, to be confirmed.

### Documents as resources

101. **A document is shared, never booked.** It has no quantity, no calendar and no time slots, and it can be used by several people at the same time. When the client accepts a request for a document (in an offer, as an RFI or through a change request), the client attaches the document from the library or uploads it, and it is shared with that bidder or contractor at once. If the client does not have it yet, the client asks a colleague to provide it; the request stays accepted until the colleague attaches the document, which shares it. Other bidders do not see it.
102. **A text request is served by resources the client selects.** When a request matches no listed resource (decision 106), it reaches the client and the team as a description in the requester's own words. When accepting it, the client selects one or several resources from the library to serve it, for example three drawings for "electrical drawings of line 3". Each resource of a request is booked separately (equipment, site access, staff time) or shared (documents). A request asks for one type of resource only; a need that spans several types, such as site access with an operator, is sent as one request per type.
103. **The intervention's Resources tab manages its resources of all four types**: documents, equipment, site access and staff time, the resources the client makes available to deliver the intervention. The same tab is used while the intervention is a draft and after it is published. The list shows each resource with its type; clicking one opens a drawer with its details and a calendar of its use (its bookings). There is no calendar shared by several resources.
104. **A document is one type of resource. A switch marks it as a specification or not.** A new document starts as a draft. Bidders see only the specifications the client has made public. Any other document is given to a bidder only when they request it on a milestone. The Resources tab explains this difference to the client.
105. **Resources can be added after publication.** When the client makes a specification public on a published intervention, the bidders are notified at once; a specification still in draft is not shown or announced. Other resources are not announced; bidders request them.
106. **A bidder requests a resource by describing the need.** The platform matches the description against the resources listed on the intervention and lets the bidder request a matching one. When nothing matches, the description is sent as a text request to the client and the team, who provide what is needed.
107. **A request asks for a quantity of one resource.** For example, four laptops in one request. The client gives all of it, part of it or none, each request decided on its own, and can serve it from several resources (two laptops of each model); the bidder sees how much was given, such as "3 of 4 given". Requesting the same resource again means the bidder needs more, and the bidder can cancel a request made by mistake. The quantity of a resource describes what the company owns; it sets no limit per intervention. A booking covers some or all of the quantity given from one resource, so units needed at different times get separate bookings.
108. **The team moves to the intervention's configuration.** Inviting and managing colleagues is part of configuring the intervention, a separate space from the intervention itself, designed later. Decisions 96–99 still apply there.

### List and record panel (the archetype of collection screens)

Screens 27 to 66 on the board (messages: 67 to 75). Every screen that lists records of one kind follows this archetype; the sample on the board is a list of resources, and its labels ("Records", "Linked records") stand for each collection's own.

109. **A collection screen is a list with a record panel.** Clicking a record opens its panel on the right, beside the list. Records people look at open in the panel: a resource, a document, a request, a booking, a colleague. Records people work inside open their own page instead: the intervention, and later the offer. The first collections to use it are the company's resources and an intervention's Resources tab.
110. **The list has a fixed structure.** A header with the collection's title and its main action ("+ Add record"); a toolbar with a search field, the collection's filter menus; the records; and the records, loaded 30 at a time as the user scrolls (infinite scroll, no page numbers); the header shows the total ("42 records", or "12 of 42 records" with a search or filters). Search filters as the user types, on the name and the description. A filter menu lists choices with check boxes; a menu with active choices shows their number ("Status (1)"), and "Clear filters" resets them all. Tables sort on their column headers (not on people or counts): a first click sorts in the column's first direction, a second reverses it, a third goes back to the default order. The view and the last sort are remembered per collection on that browser.
111. **The panel opens beside the list, never over it.** Nothing is dimmed and the list stays usable: clicking another record switches the panel to it, and the open record stays marked in the list (a bar on the left of its row, a heavier border on its card). The panel opens 560 px wide, or at the width the person last chose (decision 131). While it is open, the list shows what fits beside it: a table keeps as many columns as fit, in the order of importance its collection gives (the name always first); cards go to two per row, or one when the list is narrow, and the toolbar wraps onto two lines. Collapsing the sidebar gives the list more room, and the table shows more columns again.
112. **The screen's state is in its address.** The search, filters and sort, the open record (?open={id}) and a creation in progress (?new) are in the address, so a link opens the same list with that record's panel, and the browser's Back button closes the panel or returns to the record shown before. The full page has its own address ({collection}/{id}).
113. **Keyboard.** With the panel open, the up and down arrows open the previous and next record of the page; Enter opens the record in focus; Escape closes the panel, then the list keeps the focus on that record's row.
114. **The panel has a fixed structure.** A top bar with the record's type (a chip) on the left, and on the right: favorite, Share, more actions, open full page, close. Then the title, a line with who added the record and when, the properties (label on the left, value on the right), the sections of linked records, and the activity at the bottom. Each collection decides its properties and sections. A section shows its count; each item opens in the same panel; "+ Link or add" adds one; an empty section shows "No items yet." with "+ Add".
115. **One panel at a time.** Opening a linked record replaces the panel's content and shows a Back link with the previous record's name; Back returns to it. A linked record that has its own page (an intervention) opens that page instead.
116. **Values are edited in place.** A value the person may change looks like plain text with editing cues (decision 130); clicking it edits it in place, and the change saves when the field is left or Enter is pressed (Escape puts the value back). A value with set choices (a status, an owner) opens a menu that saves as soon as a choice is made. There is no Save or Cancel button. A change that is refused or fails puts the value back and is reported as a message (decision 132), never as text under the field.
117. **More actions** opens a menu: Open full page and Copy link, then, separated, Archive and Remove. Remove asks for confirmation with a danger button.
118. **Panel states.** While a record loads, the panel shows grey placeholders where its title, properties and sections will be, and the list stays as it is. A record that was removed, or that the user can no longer see, shows "This record is no longer available." with a Close button.
119. **List states.** An empty collection shows "No records yet", a short line on what to do, and the main action, without the toolbar or footer. When the search or filters match nothing, the list shows "No records match your search" with "Clear filters".
120. **The full page shows the same record in two columns.** A breadcrumb back to the list (decision 123); the type, title, properties and linked records on the left (8 columns); the activity on the right (4 columns). Its top bar keeps favorite, Share and more actions.
121. **Below 1024 px, the panel becomes a page.** The list takes the full width, as rows with the name, its detail line and the status (screen 56); each collection says what its detail line shows (a file's "PDF · 1.2 MB", an item's owner) and which value is its status. A row opens its record; rows have no checkbox, so selecting several records and their bulk actions stay on wider screens. The sort and the filters sit behind one "Filters" button, with how many filters are chosen ("Filters (1)"): it opens a panel with the sort first (each sortable column: first direction, reversed, then the default order), then each filter's options, then "Clear filters" (screen 59, decided 2026-11-23). Opening a record shows it full screen with "‹ Records" to go back; its address follows decision 112. Back always goes up one level: a document, then the Resources tab, then the intervention, then the list of interventions.
122. **A record page can hold collections.** An intervention is a record people work inside, so it opens as a page; its Resources tab is a collection and follows this archetype inside that page. The panel then takes the full height on the right; the intervention's title and subtabs stay above the list on the left.
123. **"Open full page" makes the panel the main view.** The record opens at its own address within its context (for example /interventions/{id}/resources/{resourceId}), with a breadcrumb of that context: Interventions › Pump overhaul, line 3 › Resources › Pump specification; each step can be clicked. Going back returns to the list with the panel open on that record. The same record shows what belongs to the context it was opened from: from an intervention, a document also shows its Specification switch, the requests it served there and the other interventions using it; from the company's library, only the document itself. The panel can also be made wider in place (decision 131).
124. **Between 1024 and 1439 px, opening a panel folds the sidebar to the 57 px rail** for as long as the panel is open, and unfolds it when the panel closes, so the list keeps about 400 px. At 1440 px and more, the sidebar, the list and the panel sit side by side. Below 1024 px, decision 121 applies.
125. **A new record is created automatically, in the panel.** "+ Add" opens the panel as the normal record view, with the name field focused and every other field set to its default: the current user as owner, the first status of its lifecycle (a document starts as a draft), a quantity of 1, and the context it was opened from. In a filtered list, the filters are defaults too: every filter with one chosen value sets that value (Type: Document → a document), and the scope of a drilled list links the new record to its parent, so the new record belongs to the list it was created in. There is no Create or Cancel button; the top bar says "Not saved yet". The record is created as soon as every required field has a value (usually when the user leaves the name field); a message "Record created · Undo" shows for 5 seconds, the record appears at the top of the list, and from then on every change saves like any edit in place. Leaving before that: with nothing typed, the panel closes and nothing is created; with something typed but a required field empty, "Discard this new record?" asks to keep editing or discard. Until it is created, the input lives only in the browser tab, so the server never holds incomplete records. Modals are kept for confirmations only. Records people work inside keep their own creation page (an intervention, decision 94).
126. **A refresh brings back the same screen.** The address restores the search, filters, sort, open record and creation; the browser tab also remembers the panel's Back links, the place in the list (decision 144), and the values typed in a creation. Coming back to a collection from the sidebar restores how it was left in that tab. The build details are in `collection-archetype-spec.md`.
127. **A panel section shows its first 5 linked records, with "Show all" on its title line (the count is already in the title).** "Show all" opens those records as the main list: the other collection, filtered to the parent record by a chip in the toolbar ("Linked to: Pump specification"). It is a normal collection screen: search, sort, panel, infinite scroll and creation all work, and a record created there is linked to the parent. Its address carries the filter (for example /resources?f.linkedTo={id}).
128. **The previous view folds into a 32 px strip after the sidebar.** The strip shows that view's name vertically ("Records · Pump specification"); clicking it, or the browser's Back button, returns to it exactly as it was: list, scroll position and open panel. Each level of drilling adds a strip; at most 2 show, and older levels fold into the first, which opens a menu of them. Removing the filter chip turns the list into the plain collection and keeps the strips. Below 1024 px there are no strips: a ‹ at the start of the top bar, before ☰ and the logo, goes up one level, as the browser's Back does (screen 58, decided 2026-11-23); it shows only on a list reached by drilling. Coming back to the list returns to the place it was left (decision 144).
129. **Every record has a description written in Markdown.** It sits in the panel (and the full page) under the properties, shown formatted: headings, paragraphs, bold and italic, lists, check lists, links and tables. Editing it opens a Markdown editor in place, with Write and Preview tabs and a small toolbar (bold, italic, heading, list, numbered list, link). The description saves automatically as the person writes, with a status under it (Saving…, Saved, or Not saved with Retry); there is no Save or Cancel button. Raw HTML is never shown or run. Files are not put in the description; they have their own section.
130. **Each person sees a record in view or edit mode, value by value, according to their rights.** The record's definition says, for each property, the title, the description, each section and each action, who may change it, from the person's role and responsibility on that record (for example, a resource provider may change a booking's status but not its slots). A value the person may change shows the editing cues (decision 116); any other value is shown as plain text. When the person may change nothing, the top bar says "View only", sections have no "+ Link or add", and more actions keeps only Open full page and Copy link; favorites stay, since they are personal. The server checks every change again and refuses it when the right is missing.
131. **The person can resize the list and the panel** by dragging the divider between them, or with the arrow keys once the divider has the focus; a double-click puts back the default width (560 px). While dragging, the panel can grow until the list keeps 400 px, and the panel never gets narrower than 400 px. The chosen width is remembered per collection on that browser and used the next time a panel opens, but only within a reasonable range: a width saved beyond 720 px, or beyond 60% of the space for the list and the panel, comes back at that limit, so an extreme drag never becomes the next default. Below 1024 px, where the panel is a page, there is no divider.
132. **Refused or failed actions, and confirmations, are messages at the bottom of the screen** (screens 67 to 75). A message is a short black bar, centered at the bottom: errors start with an error mark, an action (Retry, Undo) is underlined, and each has a close button (×). It names the record and the field concerned, so it makes sense on its own: "The name can't be empty. It was put back.", "“Quantity” couldn't be saved for Forklift, 2.5 t." with Retry, "You can no longer change “Status” on Pump specification.", "The record couldn't be created." with Retry, "Seal drawings couldn't be archived." with Retry, "Hydraulic jack couldn't be removed.", "The link couldn't be copied."; and confirmations such as "Link copied", "Record created" with Undo, and "Seal drawings archived" with Undo (an archived record stays in the database, so Undo restores it; a removed one has no Undo). When a change hits a record someone else removed, the list refreshes by itself, the panel closes, and the message says "Pump specification is no longer available. The list was refreshed." A message belongs to the interaction that caused it: the messages about a record leave when another record opens, the panel closes, the full page opens or the person leaves the collection; a new error on the same value replaces that value's message, and a successful save of it removes it. A message without an action closes after 6 seconds; one with Retry or Undo stays until it is used, closed, or its interaction is over; pointing at a message or focusing it pauses its countdown. At most three show at once, the newest at the bottom. Errors are announced to screen readers at once, confirmations politely; a message never takes the keyboard focus. The description's status line (Not saved with Retry, too long) and the loading states (list, next page, record) stay where they are, since they describe what is on screen.

133. **Every value has one of fifteen field types**, the same in the table and the panel: text, rich text, number, single select, multi select, date, date range (a period, picked in a range calendar), checkbox, URL, email, phone, location, avatar, icon and file. Each has a read view and an editor; without the right to change it, only the read view shows (decision 130), and a refused change is a message (decision 132). A **location** is an address, shown with a link that opens it in a map. An **avatar** is a picture the user uploads for the record. In the table, a **rich text** shows its first line and a **file** value its count; clicking them opens the record, whose panel has the full editor.
134. **Several records are selected with checkboxes, and archived or removed at once** (screens 60 to 63). Each row of the table has a checkbox; the one in the header selects every loaded row (not the records not loaded yet). While rows are selected, the toolbar above the table shows the count, Archive, Remove and a button that clears the selection, in place of the search and the filters, which come back when the selection is cleared. An action shows when at least one selected record allows it; the confirmation says how many it applies to ("Archive 2 of 3 records?") and names a record left out. Records that fail stay selected, with one message and Retry; the others leave the list.
135. **A value changed on a selected row changes it on every selected row** (screens 64 and 65), for the values several records can share: single select, multi select, checkbox, date, date range, number and owner. Name, text, rich text, file, avatar, icon, URL, email, phone and location stay on the one record. The menu or field says how many records the choice applies to; afterwards a message says what changed, with Undo. Records the person may not change, and those whose save fails, keep their value; the message says how many changed ("2 of 3"), and the failed ones stay selected, with Retry.
136. **A changed record keeps its place in a sorted list** (screens 65 and 66), even when it no longer matches the sort or a filter, so nothing moves under the pointer. The list is sorted again when the person sorts, searches or filters, clears the selection, opens another record, or presses Sort now on the line above the table, which says how many changed records keep their place in the collection's words ("After a change, 2 items keep their place."); a reload sorts it too. This holds for one value as for several.
137. **A linked record opens in the panel, and the record left folds into a tab between the list and the panel** (screens 44 and 48 to 52). The tab is 32 px wide, with a ‹ at the top and the record's name written vertically, and takes its room from the list, so the panel keeps its width. Clicking a tab opens that record again and removes the tabs after it. The panel's × goes back one step: it opens the previous record, and closes the panel only when there is none left (the browser's Back does the same). At most 2 tabs show; with more steps, the first stands for the older records ("2 earlier records") and opens a menu of them, newest first. A linked record of another kind, such as a resource request, opens in its own kind of panel; a record people work inside, such as an intervention, opens its page instead, and Back returns to the list with the panel. A linked record no longer available says so in the panel, and × goes back to the previous record. Below 1024 px there are no tabs and no other back control: the panel's × goes back one step, and "‹ {collection}" returns to the list.
138. **Table columns keep their width; the table scrolls sideways** (decided 2026-11-23). Every column shows, in the collection's order, at its own width, whether the panel is open or not; when they don't all fit, a horizontal scrollbar under the table reaches the others. The selection checkbox and the record's name stay pinned on the left while the other columns scroll under them, so a row stays identifiable. Opening, resizing or closing the panel only narrows or widens the window onto the table: no column comes or goes. This replaces showing "the columns that fit, by priority".
139. **An editor is built only when the person reaches its value** (decided 2026-11-23). Opening a record shows its values; none of them is a field until the person reaches it. Each value (a text, a link, a choice, tags, an icon, a checkbox, a date, a period, a number, a picture, files) shows exactly as its field, menu or buttons look at rest, until the pointer is over it, the keyboard (Tab) reaches it or a file is dragged over it, and then becomes its field, with the focus in it. The same holds in the panel for every value, and in the table by row: a row's text fields, links, choices, tags, checkboxes, dates, numbers and its selection checkbox are built when the pointer or the focus reaches the row (a selected row keeps its checkbox). The record's title is the exception: the focus goes to it when the record opens. Linked records in the panel are loaded when the person scrolls near them.
140. **A section keeps its own order** (decided 2026-11-23). In the record panel, a section (its first five linked records) always shows them in its own order: a linked record changed elsewhere may move in it, or leave the first five, at once. Sections are short previews, mostly read; decision 136 (a changed record keeps its place until Sort now) applies to lists only.
141. **After logging in, the user lands on the page they asked for.** A logged-out visitor who opens a signed-in page (a record's link, for example) is sent to log in, and the page is kept in the browser (localStorage), so every way of logging in finds it: password, Google, sign-in link opened in another tab, sign up. It works once and expires after an hour; otherwise the user lands on the dashboard. Onboarding still comes first for a client without a company, and the kept page is then dropped. A sign-in link opened on another device lands on the dashboard.
142. **Pages are matched by React Router (version 8, data mode).** One router serves every page; the redirects (log in, onboarding, dashboard) and the two layouts stay in the app's root route. Data mode was chosen so `navigate()` stays a plain function code outside components can call; loaders are not used for now.
143. **"+ Link or add" under a section searches existing records, or adds a new one** (decided 2026-11-23). Under a section of the record panel (screens 45 and 57), "+ Link or add" opens a small panel: a search over the linked collection's records not yet linked to this record (eight at a time); picking one links it at once, and the section shows it. At the bottom, "+ Add part" (the collection's own words) opens the section's list, as "Show all" does, with a new record started: it is created already linked, and Back returns to the panel. The button shows only to people with the right to add in that section; a record that can be linked to only one parent (a part belongs to one item) moves to this one.
144. **A refresh comes back to the place in the list, loading one page, not every page above it.** The tab remembers the first record in view, as the page holding it (by cursor, not page number, since page numbers shift when records are added or archived) and its row in that page. After a refresh, only that page is loaded; when the record sits near its top, the page before loads too. The scrollbar does not start at the top, which shows there is more above; scrolling up loads the earlier pages one at a time. No room is reserved for the records above. If the remembered record was archived or filtered out since, the list starts at the next one in its order. The memory is per browser tab and per list (search, filters and sort): a new tab, or another search, starts at the top (decided 2026-11-23).
145. **A collection that lives inside a record keeps that record everywhere it is opened.** Its list's address carries the record in the path (`/interventions/42/resources`), so "Show all" from a section, a record's full page and a shared link all stay within it. A record opened from a section in the panel is read and changed within the record it was opened from; the address does not repeat it, since that record is the one before it in the panel's tabs. If a record had two sections of the same collection with different contexts, the first one's applies, until such a case exists (decided 2026-11-23).
146. **The description is shown in its editor from the start; there is no separate view to click into.** In the record panel and on the full page, the description is a rich-text editor (Plate) showing the formatted text. Someone with the right to change it writes in it directly; for someone without it, the same editor is read-only. The toolbar (bold, italic, heading, list, numbered list, link) shows while the cursor is in the description. There are no Write and Preview tabs, and the Markdown source is never shown; the description is still stored and sent as Markdown. Saving is unchanged (automatic, 1 second after typing stops and when the editor loses focus); opening a description never saves it. Escape leaves the editor (decided 2026-11-24).
147. **A value changed on several selected records is sent in one request** (decision 135). Saving each record one after another froze the table with many records selected: one request each, and the list redrawn and reloaded after every record. A collection's data source can now change several records in one request (`updateMany`: the ids and the change, answered with the records changed and those refused, each with its `ERROR_…` code); the list then updates and reloads once. Undo sends one request per previous value. A data source without it keeps saving each record on its own. The default REST adapter uses it only when the collection names its route, since the backend does not have it yet (decided 2026-11-24).
148. **The list header is one row, without the total, and its create button says "New".** The title, then (on the right) the search and filters or the selection's actions, then "New", all on one line at a smaller size. The total ("42 records", "12 of 42 records") is no longer shown. The create button in the header and in the empty state reads "New" for every collection; a linked section's "+ Add …" keeps the collection's own label. A new search, filter or sort keeps the current rows in view until the new ones arrive, instead of replacing the table with placeholders (decided 2026-11-24).
149. **The list is filtered and sorted from two menus, Filter and Sort, where people compose their own rules.** They replace the one menu per filter (and, on narrow screens, the Filters panel); the same two menus show at every width. **Filter** lists the rules in force, one per line: a field, a condition and a value ("Quantity greater than 5"), with × to remove it and "+ Add a filter"; every rule must match, a new rule applies once it has a value, and a field has one rule at most (a field already in a rule is not offered again, so "is Draft, Valid" and "is not Valid" can't both be set). The fields are the collection's fixed filters (Status, Owner: "is" or "is not" one of their values) and the columns its definition marks as filterable, with conditions by type: a text "contains" or "is", a number "is", "greater than" or "less than", a date "on", "after" or "before", a choice or tags "is" or "is not" one of the values, a yes/no "is". **Sort** lists the sort levels, the first one first ("Status ascending, then Quantity descending"): each with its column, its direction (pressed to reverse it) and ×, and "+ Add a sort" for the next sortable column; with no level, the collection's default order applies. A column header still sorts by that column alone (first direction, reversed, then the default order) and is marked for the first level. Both menus show how many rules or levels are set ("Filter (2)"). In the address and the request, a rule is `f.{field}` for "is" and `f.{field}.{condition}` for the others (`f.quantity.gt=5`), and the levels are `sort=status:asc,quantity:desc`. Levels can't be reordered yet: remove one and add it again (decided 2026-11-24).

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
5. Client accepts or rejects each RFI; an accepted document is shared as in decision 101, and an accepted site visit is handed over right away by a resource provider, who confirms it as in use cases 21–23.
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
21. For each accepted request for equipment, site access or staff time of an awarded offer, now or later, the client records its booking slots (within the milestone timeline) and assigns the resource provider. An accepted document request is shared instead (decision 101), without a booking.
22. The resource provider confirms or declines the booking.
23. When a booking is declined, the client is informed while the contractor keeps waiting. The client then assigns another resource or other slots, removes the criterion that needs the resource, or rejects the request with a reason.
24. Client confirms the launch of an awarded offer; the contract is signed and the completion date is confirmed. Resources not yet booked can be booked later, or settled outside the platform.

**Execution (after contract, for each awarded offer)**

25. Contractor changes a milestone from draft to in progress; several milestones can be in progress at the same time.
26. Client staff open the intervention board and see the milestones they are involved in, the resources they must hand over with their slots and statuses, and the criteria they witness, with the next one due first.
27. The resource provider hands over the resource on time and updates its status: hands over the equipment, opens the site access, or starts the staff time. Documents are not handed over this way: they are shared (decision 101).
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
accepted ──(equipment, site access, staff time: offer awarded, or right away for a site-visit RFI)──▶ client creates a booking
accepted ──(document: the client attaches it, or the assigned colleague does)──▶ shared (no booking)
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
| **Resource** | Type (equipment, site access, staff time, document), name, quantity and availability calendar (built from bookings; not for documents), file (documents only) |
| **Resource request** | Milestone, sender, type of resource asked, description in the requester's own words, quantity asked (not for documents), change request (if it came from one), status, rejection reason (for example, unavailable), colleague asked to provide the document (documents only) |
| **Resource serving a request** | Resource request, resource, quantity given (not for documents), date shared (documents only). One request can be served by several resources: two forklifts for "2 forklifts", or three drawings for "electrical drawings of line 3" |
| **Booking** | Resource serving a request (one resource of one request), quantity booked, resource provider, time slots, status, handover date, return date |
| **Change request** | Milestone, description, requested option (extra resources, extension of time, move a criterion, waive a criterion, descope the milestone) with its details, status, client's reason when rejecting |
| **Report** | Offer, kind (completion or warranty), milestones (signed off or descoped), criterion history, change requests, resources used, completion date compared with the actual completion date; visible to the client and the contractor; PDF export |

## 8. Open questions

No open questions remain for the use cases.

### Parked (not important for now)

- Whether the contractor keeps access after the warranty period ends.
- Whether witnesses record test results on a phone, on site.
