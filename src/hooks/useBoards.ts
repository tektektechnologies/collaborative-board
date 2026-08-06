import { useCallback, useEffect, useState } from 'react'
import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { boardDoc, boardsCollection } from '../firebase'

export type BoardSummary = {
  id: string
  noteCount: number
  createdAt: Date | null
}

export function useBoards() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      boardsCollection(),
      (snapshot) => {
        const nextBoards: BoardSummary[] = snapshot.docs.map((boardSnapshot) => {
          const data = boardSnapshot.data()
          const createdAtRaw = data.createdAt

          // Older boards were created without createdAt — backfill once
          if (!createdAtRaw) {
            void setDoc(
              boardSnapshot.ref,
              { createdAt: serverTimestamp() },
              { merge: true },
            )
          }

          return {
            id: boardSnapshot.id,
            noteCount: Array.isArray(data.notes) ? data.notes.length : 0,
            createdAt:
              createdAtRaw && typeof createdAtRaw.toDate === 'function'
                ? createdAtRaw.toDate()
                : null,
          }
        })

        nextBoards.sort((a, b) => {
          const aTime = a.createdAt?.getTime() ?? 0
          const bTime = b.createdAt?.getTime() ?? 0
          return bTime - aTime
        })

        setBoards(nextBoards)
        setLoading(false)
        setError(null)
      },
      (snapshotError) => {
        setError(snapshotError)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const createBoard = useCallback(async () => {
    const boardId = crypto.randomUUID()
    await setDoc(boardDoc(boardId), {
      notes: [],
      createdAt: serverTimestamp(),
    })
    return boardId
  }, [])

  return { boards, loading, error, createBoard }
}
