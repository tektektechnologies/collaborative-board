import { useCallback, useEffect, useState } from 'react'
import {
  getCountFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { boardDoc, boardsCollection, notesCollection } from '../firebase'

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
        void (async () => {
          try {
            const nextBoards: BoardSummary[] = await Promise.all(
              snapshot.docs.map(async (boardSnapshot) => {
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

                // Count notes from the subcollection (not the old array field)
                const notesCountSnap = await getCountFromServer(
                  notesCollection(boardSnapshot.id),
                )

                return {
                  id: boardSnapshot.id,
                  noteCount: notesCountSnap.data().count,
                  createdAt:
                    createdAtRaw && typeof createdAtRaw.toDate === 'function'
                      ? createdAtRaw.toDate()
                      : null,
                }
              }),
            )

            nextBoards.sort((a, b) => {
              const aTime = a.createdAt?.getTime() ?? 0
              const bTime = b.createdAt?.getTime() ?? 0
              return bTime - aTime
            })

            setBoards(nextBoards)
            setLoading(false)
            setError(null)
          } catch (loadError) {
            setError(
              loadError instanceof Error
                ? loadError
                : new Error('Failed to load boards'),
            )
            setLoading(false)
          }
        })()
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
    // Metadata only — notes live in boards/{boardId}/notes
    await setDoc(boardDoc(boardId), {
      createdAt: serverTimestamp(),
    })
    return boardId
  }, [])

  return { boards, loading, error, createBoard }
}
