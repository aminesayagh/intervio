# Intervio — deferred features

**Date:** 2026-11-17  
**Purpose:** Features we discussed and kept out of the core use cases and the database schema. Each one can be added later without changing the core model.

## Information board: document management

Removed from the Information board use cases. The chat itself (asking for information) and turning a missing document into an RFI or a change request stay in the core.

- **Saved documents:** the contractor saves documents found through the chat.
- **Linking documents to a milestone:** once linked, the client and client staff can see them.
- **Multiple chats:** the contractor can open several chats and keep their saved material.

**Why deferred:** documents the client provides are already resources on their milestones. If a specific document organisation is needed later, it can be stored as metadata on existing files.

## Offer comparison for the client

Give the client real tools to compare offers side by side: completion dates, milestones, acceptance criteria and requested resources.

**Why deferred:** it reads the existing offers and adds no core data.

## Client–bidder discussion during review

Discussion between the client and a bidder about an offer happens outside the platform. A later feature could let users record that a discussion took place, for information only, without changing any status.

**Why deferred:** statuses only change through real actions on the offer (submit, send items back, award, decline).

## Several client accounts per company

Let a client invite colleagues as additional clients of the same company. For now there is one client account per company.

**Why deferred:** the invitation flow for this is a separate feature; client staff already cover colleagues who help.

## Several companies per user

Let a user own and manage several companies. The data already allows it (decision 67) and Settings has one tab per company with an "Add a company" button (decision 86), which only says it is not available yet. Still to design: what the button opens, and how the client board shows which company the user is working in.
