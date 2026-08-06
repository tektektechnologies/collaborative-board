import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  const { notes, loading, error, addNote, updateNote, deleteNote } = useBoard(
    boardId ?? null,
  )
  const [copyStatus, setCopyStatus] = useState('')

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

  function handleDeleteNote(id: string) {
    void deleteNote(id)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('Link copied')
    } catch {
      setCopyStatus('Could not copy link')
    }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <div>
          <Link to="/" className="board-home-link">
            ← Home
          </Link>
          <h1>Board: {boardId}</h1>
        </div>
        <div className="board-actions">
          <button type="button" onClick={handleCopyLink} disabled={!boardId}>
            Copy link
          </button>
          <button
            type="button"
            onClick={handleAddNote}
            disabled={loading || !!error || !boardId}
          >
            Add note
          </button>
        </div>
      </div>

      {copyStatus && <p className="board-status">{copyStatus}</p>}
      {loading && <p className="board-status">Loading board…</p>}
      {error && (
        <p className="board-error" role="alert">
          Could not load board: {error.message}
        </p>
      )}

      <div className="board-canvas">
        {!loading &&
          !error &&
          notes.map((note) => (
            <NoteView
              key={note.id}
              note={note}
              onMove={handleMoveNote}
              onUpdateText={handleUpdateNoteText}
              onUpdateColor={handleUpdateNoteColor}
              onDelete={handleDeleteNote}
            />
          ))}
      </div>
    </div>
  )
}
