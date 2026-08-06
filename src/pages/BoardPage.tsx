import { useState } from 'react'
import { useParams } from 'react-router-dom'

type Note = {
  id: string
  x: number
  y: number
  text: string
  color: string
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [notes, setNotes] = useState<Note[]>([])

  function handleAddNote() {
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x: 100,
        y: 100,
        text: 'New note',
        color: '#fef08a',
      },
    ])
  }

  return (
    <div>
      <h1>Board: {boardId}</h1>
      <button type="button" onClick={handleAddNote}>
        Add note
      </button>
      <pre>{JSON.stringify(notes, null, 2)}</pre>
    </div>
  )
}
