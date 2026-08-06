import { useCallback, useEffect, useRef, useState } from 'react'
import { onSnapshot, setDoc } from 'firebase/firestore'
import { boardDoc } from '../firebase'
import type { Note } from '../notesStorage'

export type UseBoardResult = {
  notes: Note[]
  loading: boolean
  error: Error | null
  addNote: (note: Omit<Note, 'id'>) => Promise<void>
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>
}

export function useBoard(boardId: string | null): UseBoardResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(boardId !== null)
  const [error, setError] = useState<Error | null>(null)
  const notesRef = useRef<Note[]>([])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    if (!boardId) {
      notesRef.current = []
      setNotes([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = onSnapshot(
      boardDoc(boardId),
      (snapshot) => {
        const data = snapshot.data()
        const nextNotes = Array.isArray(data?.notes) ? (data.notes as Note[]) : []
        notesRef.current = nextNotes
        setNotes(nextNotes)
        setLoading(false)
      },
      (snapshotError) => {
        setError(snapshotError)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [boardId])

  const addNote = useCallback(
    async (note: Omit<Note, 'id'>) => {
      if (!boardId) return

      const nextNotes = [
        ...notesRef.current,
        { ...note, id: crypto.randomUUID() },
      ]
      await setDoc(boardDoc(boardId), { notes: nextNotes }, { merge: true })
    },
    [boardId],
  )

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      if (!boardId) return

      const nextNotes = notesRef.current.map((note) =>
        note.id === noteId ? { ...note, ...updates } : note,
      )
      await setDoc(boardDoc(boardId), { notes: nextNotes }, { merge: true })
    },
    [boardId],
  )

  return { notes, loading, error, addNote, updateNote }
}
