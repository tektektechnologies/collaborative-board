import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type FieldValue,
  type Timestamp,
  type UpdateData,
} from 'firebase/firestore'
import { noteDoc, notesCollection } from '../firebase'
import type { Note } from '../types'

/** Fields the UI may send when updating a note (timestamps may be FieldValue). */
export type NoteUpdates = Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>> & {
  updatedAt?: FieldValue | Date | null
}

export type UseBoardResult = {
  notes: Note[]
  loading: boolean
  error: Error | null
  addNote: (
    partial: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>
  updateNote: (noteId: string, updates: NoteUpdates) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
}

const SERVER_SYNC_TIMEOUT_MS = 8000
const WRITE_TIMEOUT_MS = 10000

const FIRESTORE_UNREACHABLE_MESSAGE =
  'Could not reach Cloud Firestore. In Firebase Console open Build → Firestore Database and Create database for this project, then reload.'

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  return null
}

function mapNoteDoc(id: string, data: Record<string, unknown>): Note {
  return {
    id,
    x: typeof data.x === 'number' ? data.x : 0,
    y: typeof data.y === 'number' ? data.y : 0,
    text: typeof data.text === 'string' ? data.text : '',
    color: typeof data.color === 'string' ? data.color : '#fef08a',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

async function withWriteTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(FIRESTORE_UNREACHABLE_MESSAGE))
      }, WRITE_TIMEOUT_MS)
    }),
  ])
}

export function useBoard(boardId: string | null): UseBoardResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(boardId !== null)
  const [error, setError] = useState<Error | null>(null)
  const hasServerSyncRef = useRef(false)

  useEffect(() => {
    if (!boardId) {
      hasServerSyncRef.current = false
      setNotes([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    hasServerSyncRef.current = false

    const notesQuery = query(
      notesCollection(boardId),
      orderBy('createdAt', 'asc'),
    )

    // NOT_FOUND / missing database → client stays offline and only emits fromCache snapshots
    const syncTimeoutId = window.setTimeout(() => {
      if (!hasServerSyncRef.current) {
        setError(new Error(FIRESTORE_UNREACHABLE_MESSAGE))
        setLoading(false)
      }
    }, SERVER_SYNC_TIMEOUT_MS)

    const unsubscribe = onSnapshot(
      notesQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const nextNotes = snapshot.docs.map((noteSnapshot) =>
          mapNoteDoc(noteSnapshot.id, noteSnapshot.data()),
        )
        setNotes(nextNotes)

        if (!snapshot.metadata.fromCache) {
          hasServerSyncRef.current = true
          window.clearTimeout(syncTimeoutId)
          setError(null)
          setLoading(false)
        }
      },
      (snapshotError) => {
        window.clearTimeout(syncTimeoutId)
        setError(snapshotError)
        setLoading(false)
      },
    )

    return () => {
      window.clearTimeout(syncTimeoutId)
      unsubscribe()
    }
  }, [boardId])

  const addNote = useCallback(
    async (partial: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!boardId) return

      try {
        await withWriteTimeout(
          addDoc(notesCollection(boardId), {
            ...partial,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        )
      } catch (writeError) {
        const err =
          writeError instanceof Error
            ? writeError
            : new Error('Failed to add note')
        setError(err)
        throw err
      }
    },
    [boardId],
  )

  // Conflict strategy for concurrent edits on the SAME note:
  // Firestore updateDoc is last-write-wins per field/document. If two clients
  // both update `text`, the later server write wins and onSnapshot replaces
  // the loser's local text. That is acceptable here: sticky-note text is not
  // character-merged (no OT/CRDT). Edits to *different* notes (or different
  // fields on the same note, e.g. text vs x/y) do not overwrite each other
  // because we only send the changed fields in a partial updateDoc.
  const updateNote = useCallback(
    async (noteId: string, updates: NoteUpdates) => {
      if (!boardId) return

      const { updatedAt, ...fields } = updates

      // Build a partial payload — never setDoc the whole note, so untouched
      // fields (e.g. color while editing text) are preserved on the server.
      const partialUpdate: UpdateData<{
        x: number
        y: number
        text: string
        color: string
        updatedAt: FieldValue | Date
      }> = {
        updatedAt: updatedAt ?? serverTimestamp(),
      }
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          ;(partialUpdate as Record<string, unknown>)[key] = value
        }
      }

      try {
        await withWriteTimeout(
          updateDoc(noteDoc(boardId, noteId), partialUpdate),
        )
      } catch (writeError) {
        const err =
          writeError instanceof Error
            ? writeError
            : new Error('Failed to update note')
        setError(err)
        throw err
      }
    },
    [boardId],
  )

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!boardId) return

      try {
        await withWriteTimeout(deleteDoc(noteDoc(boardId, noteId)))
      } catch (writeError) {
        const err =
          writeError instanceof Error
            ? writeError
            : new Error('Failed to delete note')
        setError(err)
        throw err
      }
    },
    [boardId],
  )

  return { notes, loading, error, addNote, updateNote, deleteNote }
}
