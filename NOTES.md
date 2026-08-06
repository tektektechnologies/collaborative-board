# Notes

A few things from building this board, written while the tradeoffs are still fresh.

## Key architectural decisions

**React + Vite + TypeScript.**  
Needed a SPA with routing and a canvas-ish UI. Vite is boring in a good way — fast refresh, simple env (`VITE_*`), no webpack archaeology. TypeScript paid for itself once notes/presence shapes started drifting between hooks and pages. Could have done Next.js; didn’t need SSR or an API layer for this.

**react-router-dom, not a mega framework.**  
Home vs `/board/:boardId` is the whole app. Client-side routes + a shareable UUID in the path is enough. The board id _is_ the collaboration key.

**Firebase / Firestore for the backend.**  
Wanted realtime multiplayer without standing up a server. Firestore gives persistence + `onSnapshot` in one place, and the web SDK is fine for a small collaborative canvas. Alternatives we skipped on purpose:

- **Plain WebSockets / custom Node server** — more control, also more ops and auth glue than this assignment warranted.
- **Realtime Database** — fine for presence; we already had Firestore for notes, so keeping one database was simpler than splitting concerns.
- **Supabase / PartyKit / Liveblocks** — would’ve been interesting; would’ve also been a different stack than the brief asked for.

No Cloud Functions. Presence TTL and cleanup are client-side heuristics. That’s a trade: less infra, more “ghost cursor for 30 seconds if you yank the power cord.”

**Client-only app, secrets in Vite env.**  
Firebase web config isn’t really secret, but we still keep it in `.env` and out of git. Actual security is rules — and for the demo those are wide open.

## Decisions that stuck

**Per-note docs instead of one big `notes[]` array.**  
We started with the array on `boards/{id}` because it was simple. It also meant every drag/edit rewrote the whole list, so two people poking the same board could silently wipe each other’s notes. Splitting into `boards/{id}/notes/{noteId}` fixed that without bringing in Yjs or anything fancy. Same-note text is still last-write-wins — fine for sticky notes, not for a Google Doc.

**Partial `updateDoc`, not `setDoc` of the whole note.**  
If you only change `text`, leave `x`/`y`/`color` alone. Sounds obvious; easy to mess up when you’re copying the “write the whole array back” habit.

**Presence in Firestore, same project.**  
Could have used RTDB. Didn’t. Heartbeat ~5s, stale after ~30s, `sessionStorage` for client id so refresh doesn’t invent a new ghost. Cursor writes are throttled so they don’t drown out note updates. Abrupt tab kill still leaves a presence doc until the TTL — known, lived with it.

**No auth.**  
Assignment said no auth. Open test-mode rules. Don’t ship this as-is.

**Debounced text sync (~250ms).**  
Originally we only wrote on blur, which felt like “Firestore is slow” when really we just weren’t sending. Live-ish typing + flush on blur is enough.

**Board `name` vs URL id.**  
Rename changes the display name only. Share links stay stable. New boards default to “Untitled board”.

**Host = whoever created the board (`hostClientId`).**  
Shown as “Host” in the UI so we don’t parade guest ids for the owner. Older boards created before that field existed may still look weird.

## Would redo / spend more time on

- **Optimistic UI for moves** so drag doesn’t wait on the round trip (we already keep local position while dragging; commit could be snappier on bad networks).
- **Proper leave for presence** — `beforeunload` delete is flaky; a Cloud Function scrubbing stale docs would be cleaner.
- **Migrate old array-shaped boards** automatically instead of ignoring them.
- **Indexes / rules as code** in the repo, not “remember to click Create database in the console.”
- **Less presence write chatter** when many cursors are moving — maybe only broadcast cursor to others if someone else is on the board.
- **Inline rename** on the home page instead of `window.prompt`.
- **Tests.** There are basically none. A couple of hook tests around merge/conflict behavior would’ve saved time when we broke the array model.

## Didn’t get to

- Auth / private boards
- Undo / history
- Images or rich text on notes
- Mobile-friendly drag (touch is “works-ish,” not polished)
- Selecting multiple notes
- Board thumbnails or search on the home list
- Making the Host label rock-solid for every peer in every edge case (displayName still stored as Guest on the presence doc in places; UI often overrides to “Host” when `hostClientId` matches — messy, works for the demo)
