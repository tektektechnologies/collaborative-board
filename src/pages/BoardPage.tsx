import { useState } from 'react'
import { useParams } from 'react-router-dom'
import NoteView from './NoteView'
import './BoardPage.css'

export type Note = {
  id: string
  x: number
  y: number
  text: string
  color: string
}

export const NOTE_COLORS = [
  '#fef08a', // yellow
  '#bfdbfe', // blue
  '#bbf7d0', // green
  '#fecaca', // red
  '#e9d5ff', // purple
]

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
        color: NOTE_COLORS[0],
      },
    ])
  }

  function handleMoveNote(id: string, x: number, y: number) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, x, y } : note)),
    )
  }

  function handleUpdateNoteText(id: string, text: string) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note)),
    )
  }

  function handleUpdateNoteColor(id: string, color: string) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, color } : note)),
    )
  }

  return (
    <div className="board-page">
      <h1>Board: {boardId}</h1>
      <button type="button" onClick={handleAddNote}>
        Add note
      </button>

      <div className="board-canvas">
        {notes.map((note) => (
          <NoteView
            key={note.id}
            note={note}
            onMove={handleMoveNote}
            onUpdateText={handleUpdateNoteText}
            onUpdateColor={handleUpdateNoteColor}
          />
        ))}
      </div>
    </div>
  )
}
