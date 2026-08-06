import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { presenceCollection, presenceDoc } from '../firebase'

export type Presence = {
  clientId: string
  displayName: string
  lastSeenAt: Date | null
  cursorX?: number
  cursorY?: number
  activeNoteId?: string | null
}

export type UsePresenceResult = {
  clientId: string
  displayName: string
  /** Other clients currently considered online on this board (excludes self). */
  peers: Presence[]
  setCursor: (x: number, y: number) => void
  setActiveNoteId: (noteId: string | null) => void
}

// Heartbeat keeps lastSeenAt fresh while the tab is open.
const HEARTBEAT_MS = 5000

// Peers with lastSeenAt older than this are treated as offline.
// If a tab crashes, its presence doc can linger until this window expires
// (beforeunload delete is best-effort and often does not run).
const STALE_AFTER_MS = 30_000

// Avoid writing on every mousemove — throttle cursor presence updates.
const CURSOR_WRITE_THROTTLE_MS = 100

const CLIENT_ID_STORAGE_KEY = 'collaborative-board:clientId'
const DISPLAY_NAME_STORAGE_KEY = 'collaborative-board:displayName'

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  return null
}

function getOrCreateClientId(): string {
  const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) return existing

  const clientId = crypto.randomUUID()
  sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId)
  return clientId
}

function getOrCreateDisplayName(clientId: string): string {
  const existing = sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
  if (existing) return existing

  const displayName = `Guest ${clientId.slice(0, 4)}`
  sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName)
  return displayName
}

function mapPresenceDoc(id: string, data: Record<string, unknown>): Presence {
  return {
    clientId: typeof data.clientId === 'string' ? data.clientId : id,
    displayName:
      typeof data.displayName === 'string' ? data.displayName : `Guest ${id.slice(0, 4)}`,
    lastSeenAt: toDate(data.lastSeenAt),
    cursorX: typeof data.cursorX === 'number' ? data.cursorX : undefined,
    cursorY: typeof data.cursorY === 'number' ? data.cursorY : undefined,
    activeNoteId:
      typeof data.activeNoteId === 'string' || data.activeNoteId === null
        ? (data.activeNoteId as string | null)
        : undefined,
  }
}

function isFresh(presence: Presence, now: number): boolean {
  if (!presence.lastSeenAt) return false
  return now - presence.lastSeenAt.getTime() < STALE_AFTER_MS
}

/**
 * Tracks who is currently viewing a board via boards/{boardId}/presence/{clientId}.
 *
 * Limitations:
 * - Abrupt closes may leave a presence doc until STALE_AFTER_MS elapses.
 * - Cursor updates are throttled; remote cursors are near-realtime, not pixel-perfect.
 * - No auth: anyone with the board URL can write presence (same as notes).
 */
export function usePresence(boardId: string | null): UsePresenceResult {
  const clientId = useMemo(() => getOrCreateClientId(), [])
  const displayName = useMemo(
    () => getOrCreateDisplayName(clientId),
    [clientId],
  )

  const [peers, setPeers] = useState<Presence[]>([])
  const allPresenceRef = useRef<Presence[]>([])
  const cursorRef = useRef<{ x: number; y: number } | null>(null)
  const activeNoteIdRef = useRef<string | null>(null)
  const lastCursorWriteRef = useRef(0)

  const refreshPeers = useCallback(() => {
    const now = Date.now()
    setPeers(
      allPresenceRef.current.filter(
        (presence) =>
          presence.clientId !== clientId && isFresh(presence, now),
      ),
    )
  }, [clientId])

  const writePresence = useCallback(async () => {
    if (!boardId) return

    await setDoc(
      presenceDoc(boardId, clientId),
      {
        clientId,
        displayName,
        lastSeenAt: serverTimestamp(),
        cursorX: cursorRef.current?.x ?? null,
        cursorY: cursorRef.current?.y ?? null,
        activeNoteId: activeNoteIdRef.current,
      },
      { merge: true },
    )
  }, [boardId, clientId, displayName])

  useEffect(() => {
    if (!boardId) {
      allPresenceRef.current = []
      setPeers([])
      return
    }

    void writePresence()

    // Periodic heartbeat so peers keep seeing us as online.
    const heartbeatId = window.setInterval(() => {
      void writePresence()
    }, HEARTBEAT_MS)

    // Re-evaluate staleness even when no new snapshots arrive.
    const staleCheckId = window.setInterval(() => {
      refreshPeers()
    }, HEARTBEAT_MS)

    const unsubscribe = onSnapshot(
      presenceCollection(boardId),
      (snapshot) => {
        allPresenceRef.current = snapshot.docs.map((docSnap) =>
          mapPresenceDoc(docSnap.id, docSnap.data()),
        )
        refreshPeers()
      },
      () => {
        // Presence failures shouldn't block the board; keep last known peers.
      },
    )

    // Best-effort cleanup — browsers often cancel this on hard close/crash.
    const handleUnload = () => {
      void deleteDoc(presenceDoc(boardId, clientId))
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.clearInterval(heartbeatId)
      window.clearInterval(staleCheckId)
      window.removeEventListener('beforeunload', handleUnload)
      unsubscribe()
      // Tab navigated away / unmounted — remove our presence when possible.
      void deleteDoc(presenceDoc(boardId, clientId))
    }
  }, [boardId, clientId, refreshPeers, writePresence])

  const setCursor = useCallback(
    (x: number, y: number) => {
      cursorRef.current = { x, y }
      const now = Date.now()
      if (now - lastCursorWriteRef.current < CURSOR_WRITE_THROTTLE_MS) return
      lastCursorWriteRef.current = now
      void writePresence()
    },
    [writePresence],
  )

  const setActiveNoteId = useCallback(
    (noteId: string | null) => {
      activeNoteIdRef.current = noteId
      void writePresence()
    },
    [writePresence],
  )

  return {
    clientId,
    displayName,
    peers,
    setCursor,
    setActiveNoteId,
  }
}
