import { useCallback, useEffect, useRef, useState } from 'react'
import { onSnapshot, setDoc } from 'firebase/firestore'
import { boardDoc } from '../firebase'
import type { Note } from '../types'

export type UseBoardResult = {
  notes: Note[]
  loading: boolean
  error: Error | null
  addNote: (note: Omit<Note, 'id'>) => Promise<void>
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
}

const SERVER_SYNC_TIMEOUT_MS = 8000
const WRITE_TIMEOUT_MS = 10000

const FIRESTORE_UNREACHABLE_MESSAGE =
  'Could not reach Cloud Firestore. In Firebase Console open Build → Firestore Database and Create database for this project, then reload.'

export function useBoard(boardId: string | null): UseBoardResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(boardId !== null)
  const [error, setError] = useState<Error | null>(null)
  const notesRef = useRef<Note[]>([])
  const hasServerSyncRef = useRef(false)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    if (!boardId) {
      notesRef.current = []
      hasServerSyncRef.current = false
      setNotes([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    hasServerSyncRef.current = false

    // NOT_FOUND / missing database → client stays offline and only emits fromCache snapshots
    const syncTimeoutId = window.setTimeout(() => {
      if (!hasServerSyncRef.current) {
        setError(new Error(FIRESTORE_UNREACHABLE_MESSAGE))
        setLoading(false)
      }
    }, SERVER_SYNC_TIMEOUT_MS)

    const unsubscribe = onSnapshot(
      boardDoc(boardId),
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.data()
        const nextNotes = Array.isArray(data?.notes) ? (data.notes as Note[]) : []
        notesRef.current = nextNotes
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

  const writeNotes = useCallback(
    async (nextNotes: Note[]) => {
      if (!boardId) return

      try {
        await Promise.race([
          setDoc(boardDoc(boardId), { notes: nextNotes }, { merge: true }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(new Error(FIRESTORE_UNREACHABLE_MESSAGE))
            }, WRITE_TIMEOUT_MS)
          }),
        ])
      } catch (writeError) {
        const err =
          writeError instanceof Error
            ? writeError
            : new Error('Failed to save notes to Firestore')
        setError(err)
        throw err
      }
    },
    [boardId],
  )

  const addNote = useCallback(
    async (note: Omit<Note, 'id'>) => {
      if (!boardId) return

      const nextNotes = [
        ...notesRef.current,
        { ...note, id: crypto.randomUUID() },
      ]
      await writeNotes(nextNotes)
    },
    [boardId, writeNotes],
  )

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      if (!boardId) return

      const nextNotes = notesRef.current.map((note) =>
        note.id === noteId ? { ...note, ...updates } : note,
      )
      await writeNotes(nextNotes)
    },
    [boardId, writeNotes],
  )

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!boardId) return

      const nextNotes = notesRef.current.filter((note) => note.id !== noteId)
      await writeNotes(nextNotes)
    },
    [boardId, writeNotes],
  )

  return { notes, loading, error, addNote, updateNote, deleteNote }
}
