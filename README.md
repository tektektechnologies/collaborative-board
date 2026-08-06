# Collaborative Board

A lightweight real-time sticky-note board (think a minimal Miro / FigJam), built with **React**, **Vite**, **TypeScript**, and **Firebase Firestore**. Anyone with a board URL can collaborate—no auth required.

Share a link, add notes, drag them around, edit text, change colors, and see who else is on the board (including remote cursors).

---

## Features

### Boards
- **Create board** from the home page → generates a unique id and opens `/board/:boardId`
- **Shareable URL** — copy the link; anyone can open the same board
- **Board list** on the home page with note count, host label, and created date
- **Delete board** — removes the board document plus its notes and presence subcollections

### Notes
- Add sticky notes on a canvas
- Drag to reposition (clamped to the canvas)
- Edit text in place (blur / Enter to save; Shift+Enter for newline)
- Change color from a small palette
- Delete a note
- Hover a note to see its last-updated timestamp

### Collaboration
- **Realtime sync** via Firestore `onSnapshot`
- **Per-note documents** so concurrent edits to *different* notes don’t overwrite each other
- **Same-note text** uses last-write-wins (documented below)
- **Presence** — who’s on the board, colored chips, and remote cursors

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript |
| Bundler | Vite 5 |
| Routing | `react-router-dom` |
| Backend | Firebase Firestore (no Auth, no Realtime Database, no Cloud Functions) |
| Deploy | Static SPA (e.g. Vercel — see `vercel.json` SPA rewrite) |

---

## Data model

```
boards/{boardId}
  createdAt: Timestamp
  hostClientId: string
  hostDisplayName: string

boards/{boardId}/notes/{noteId}
  x: number
  y: number
  text: string
  color: string
  createdAt: Timestamp
  updatedAt: Timestamp

boards/{boardId}/presence/{clientId}
  clientId: string
  displayName: string
  lastSeenAt: Timestamp
  cursorX?: number
  cursorY?: number
  activeNoteId?: string | null
```

### Why per-note documents?

Part 1 stored all notes in a single `notes: Note[]` array on the board document. Every change rewrote the whole array, so two clients editing at once could wipe each other’s work (**last-write-wins at the board level**).

Part 2 moved to **one Firestore document per note**. Clients only `updateDoc` the fields they change. Concurrent edits to different notes succeed independently.

### Conflict strategy (same note text)

If two users edit the **same note’s `text`** at the same time:

- Firestore applies **last-write-wins** for that field/document.
- The later server write wins; other clients get the result via `onSnapshot`.
- There is **no** character-level merge (no OT / CRDT).

That tradeoff is intentional for this challenge: sticky-note text stays simple, while the important multi-user failure mode (losing *other* notes) is fixed.

`updateNote` always uses **partial** `updateDoc` payloads, so updating `text` does not clear `x`, `y`, or `color`.

---

## Presence

Each browser tab gets a stable `clientId` and display name in `sessionStorage` (refresh keeps the same id; a new tab gets a new one).

While on a board:

1. The tab writes/updates `boards/{boardId}/presence/{clientId}` on a **~5s heartbeat**, and when the cursor or focused note changes (cursor writes are throttled ~100ms).
2. Everyone subscribes to the presence subcollection.
3. Peers with `lastSeenAt` older than **~30 seconds** are treated as offline.
4. On unmount / `beforeunload`, the client best-effort deletes its presence doc.

**Limitations:** a crashed tab may linger as “online” until the 30s staleness window expires. Presence is open (no auth), same as notes.

The board creator is labeled **Host** in the UI when `hostClientId` matches; other participants appear as guests (e.g. `Guest a3f2`).

---

## Project structure

```
src/
  main.tsx                 # React entry
  App.tsx                  # Routes: / and /board/:boardId
  firebase.ts              # Firebase init + collection/doc helpers
  clientIdentity.ts        # sessionStorage client id / display name
  types.ts                 # Note type
  hooks/
    useBoard.ts            # Notes subcollection subscribe + CRUD
    useBoards.ts           # Home: list / create / delete boards
    usePresence.ts         # Presence lifecycle + peers
  pages/
    HomePage.tsx           # Create / list / delete boards
    BoardPage.tsx          # Canvas, notes, presence UI
    NoteView.tsx           # Single sticky note (drag, edit, color, delete)
```

### Main hooks

**`useBoard(boardId)`**  
Subscribes to `boards/{boardId}/notes` ordered by `createdAt`. Exposes `notes`, `loading`, `error`, `addNote`, `updateNote`, `deleteNote`.

**`useBoards()`**  
Lists board metadata, creates boards (with host fields), deletes a board and its subcollections.

**`usePresence(boardId)`**  
Manages this tab’s presence document and returns other online peers plus `setCursor` / `setActiveNoteId`.

---

## Getting started

### Prerequisites

- Node.js (18+ recommended; 20.19+ ideal for latest tooling)
- A Firebase project with **Cloud Firestore** enabled

### 1. Clone and install

```bash
npm install
```

### 2. Create a Firebase web app

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Create (or select) a project
3. Add a **Web** app and copy the Firebase config
4. **Build → Firestore Database → Create database** (start in test mode for local/dev)

> If Firestore was never created for the project, the client goes offline (`NOT_FOUND`). Notes may appear locally for one browser but won’t sync to others.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in values from the Firebase SDK snippet:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Vite only exposes variables prefixed with `VITE_`. Restart the dev server after changing `.env`.

### 4. Run locally

```bash
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

To expose on your LAN:

```bash
npm run dev -- --host
```

### 5. Build

```bash
npm run build
npm run preview
```

---

## Routes

| Path | Page |
| --- | --- |
| `/` | Home — create board, list boards, delete |
| `/board/:boardId` | Collaborative canvas for that board |

---

## How to try collaboration

1. Create a board and add a note.
2. Click **Copy link** (or copy the URL).
3. Open the same URL in another browser / incognito window.
4. Edit different notes — both should stay in sync.
5. Edit the same note’s text from both sides — last write wins.
6. Move the mouse on the canvas — the other window should show your cursor.
7. Return home — the board should appear in the list with a Host label.

---

## Firestore security notes

This app assumes **open access** suitable for a demo / assignment (e.g. Firestore **test mode**, or rules that allow public read/write on `boards` and subcollections).

For anything public-facing, tighten rules (auth, per-board permissions, rate limits). Web config keys are not secrets, but open write rules let anyone modify your data.

---

## Known limitations

- No authentication or user accounts
- Same-note text is last-write-wins (not collaborative typing)
- Presence can briefly linger after an abrupt tab close (~30s)
- Old Part 1 boards that only stored a `notes` array are not auto-migrated; new notes use the subcollection model
- Boards created before host fields existed may show host as unknown until recreated

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## License

Private / coursework project unless otherwise specified.
