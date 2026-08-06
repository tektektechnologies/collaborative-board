import { useParams } from 'react-router-dom'
import { useBoard } from '../hooks/useBoard'
import type { Note } from '../types'
import NoteView from './NoteView'
import './BoardPage.css'

export type { Note }

export const NOTE_COLORS = [
  '#fef08a', // yellow
  '#bfdbfe', // blue
  '#bbf7d0', // green
  '#fecaca', // red
  '#e9d5ff', // purple
]

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { notes, loading, error, addNote, updateNote } = useBoard(boardId ?? null)

  function handleAddNote() {
    void addNote({
      x: 100,
      y: 100,
      text: 'New note',
      color: NOTE_COLORS[0],
    })
  }

  function handleMoveNote(id: string, x: number, y: number) {
    void updateNote(id, { x, y })
  }

  function handleUpdateNoteText(id: string, text: string) {
    void updateNote(id, { text })
  }

  function handleUpdateNoteColor(id: string, color: string) {
    void updateNote(id, { color })
  }

  return (
    <div className="board-page">
      <h1>Board: {boardId}</h1>
      <button type="button" onClick={handleAddNote} disabled={loading || !boardId}>
        Add note
      </button>

      {loading && <p>Loading board…</p>}
      {error && <p>Error: {error.message}</p>}

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
