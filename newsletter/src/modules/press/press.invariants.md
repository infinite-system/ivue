# press — invariants

The press is the admin's printing desk: a **piece** is the argument, its
**expressions** are the platform projections, a **posting** is one time
one projection went out. Copy lives in D1, never in the public repo.
Plan: `tasks/press-system-plan.md`. Code: this directory (`Piece`,
`Expression`, `Projection`, `Posting`, `PressApi`) plus the `expression`
job kind in `../schedule/Scheduler.ts`.

## Generator

**A projection is approved as exact text and shipped as that text or not
at all.** Everything below falls out of holding that one line against
two modes of authorship (derived from the base, or by hand) and two ways
of shipping (the X API, or a person with a clipboard).

## Reality records

- **Only X has an API we post to.** Every other platform is copied by
  hand and marked sent; the ledger row is the same shape either way.
  (`Expression.executeJob`, `Expression.markSent`)
- **X counts a URL as 23 characters** whatever its length, and shows
  about 280 before the fold. (`Projection.count`, `Projection.X_FOLD`)

## Chosen records

1. **The piece is the essence; a platform is an expression.** A piece
   carries title, claim, links, banner, base, wave, notes — never a
   date, a status, a venue, or a job. Expressions are addable in any
   number, several of one kind when venue-bound, and zero is the
   starting state. (`Piece.test.ts`: "carries no date, status, venue or
   job"; "zero expressions is the starting state")
2. **Two modes.** A `derived` row regenerates from the base on every
   base save and refuses a direct body patch; an `authored` row never
   tracks the base. Detach is one-way, derived → authored.
   (`Expression.test.ts`: "a derived body cannot be patched";
   `Piece.test.ts`: "a base save … regenerates derived expressions")
3. **Approval is of the exact text.** The lint must pass to approve; any
   body change, meta change, reorder, added segment, skip change, or
   regeneration of an approved row returns it to draft and cancels its
   job. A same-text regeneration keeps approval. (`Expression.test.ts`:
   "an edit or a regeneration of an approved row returns it to draft")
4. **A thread is approved whole; a segment is skipped, never approved.**
   Skips survive a same-count regeneration by position and clear
   otherwise; the live thread renumbers and the poster omits skipped
   segments. (`Expression.test.ts`: "skips survive a same-count
   regeneration")
5. **Every save keeps a revision** with its author (`user` from the
   dashboard, `agent` from the CLI's `X-Press-Author` header); restore
   is a new save. (`Expression.test.ts`: "every body or meta save keeps
   the previous text"; `PressApi.test.ts`: author header)
6. **Only a still-scheduled row ships.** The job holds the id and reads
   the row at run time; an edit after scheduling already cancelled the
   job. (`Expression.test.ts`: "a row no longer scheduled ships nothing")
7. **Every posting is a ledger row** — platform, venue, url, remote ids,
   who posted, the calendar entry it fulfilled — and a second posting
   keeps the first. (`Posting.test.ts`; `Expression.test.ts`: "mark sent
   by hand writes the ledger")
8. **Tables and routes are singular.** `piece`, `expression`, `posting`,
   `post_revision`, `base_revision`; `/admin/press/piece/:id`,
   `/admin/press/expression/:id/posting`. A plural path is 404.
   (`PressApi.test.ts`: "plural paths … are 404")
9. **A blog post is copied, never linked.** Bootstrapping reads the
   site's index once; the base diverges freely. (`Piece.test.ts`:
   "starts from a blog post by copying")

## Impossibilities

- An unsent post in the public repo (after the cleanup step).
- A derived body edited anywhere but through the base, or a projection
  edit reaching the base.
- An approved expression whose live text fails its platform lint.
- A scheduled expression shipping text other than the approved text.
- A save without a revision; a posting without a ledger row.
- A piece with a date, status, venue, or job; a piece refused for
  having no expressions.
- A plural table or route name in the press.
