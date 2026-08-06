import { useCallback, useEffect, useState } from 'react'
import {
  deleteDoc,
  getCountFromServer,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  getOrCreateClientId,
  getOrCreateDisplayName,
} from '../clientIdentity'
import { db, boardDoc, boardsCollection, notesCollection, presenceCollection } from '../firebase'

export type BoardSummary = {
  id: string
  noteCount: number
  createdAt: Date | null
  hostClientId: string | null
  hostDisplayName: string | null
}

const DELETE_BATCH_LIMIT = 400

async function deleteCollectionDocs(
  boardId: string,
  kind: 'notes' | 'presence',
) {
  const collectionRef =
    kind === 'notes' ? notesCollection(boardId) : presenceCollection(boardId)
  const snapshot = await getDocs(collectionRef)

  // Firestore batches max out at 500 ops; chunk deletes for large boards.
  for (let i = 0; i < snapshot.docs.length; i += DELETE_BATCH_LIMIT) {
    const batch = writeBatch(db)
    const chunk = snapshot.docs.slice(i, i + DELETE_BATCH_LIMIT)
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref)
    }
    await batch.commit()
  }
}

export function useBoards() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const currentClientId = getOrCreateClientId()

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
                  hostClientId:
                    typeof data.hostClientId === 'string'
                      ? data.hostClientId
                      : null,
                  hostDisplayName:
                    typeof data.hostDisplayName === 'string'
                      ? data.hostDisplayName
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
    const hostClientId = getOrCreateClientId()
    const hostDisplayName = getOrCreateDisplayName(hostClientId)

    await setDoc(boardDoc(boardId), {
      createdAt: serverTimestamp(),
      hostClientId,
      hostDisplayName,
    })
    return boardId
  }, [])

  const deleteBoard = useCallback(async (boardId: string) => {
    // Subcollections are not removed when the parent doc is deleted.
    await deleteCollectionDocs(boardId, 'notes')
    await deleteCollectionDocs(boardId, 'presence')
    await deleteDoc(boardDoc(boardId))
  }, [])

  return { boards, loading, error, createBoard, deleteBoard, currentClientId }
}
