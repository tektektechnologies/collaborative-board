import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { serverTimestamp } from 'firebase/firestore'
import { useBoard } from '../hooks/useBoard'
import { usePresence } from '../hooks/usePresence'
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
  const { displayName, peers, setCursor, setActiveNoteId } = usePresence(
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
    void updateNote(id, {
      x,
      y,
      updatedAt: serverTimestamp(),
    })
  }

  function handleUpdateNoteText(id: string, text: string) {
    void updateNote(id, {
      text,
      updatedAt: serverTimestamp(),
    })
  }

  function handleUpdateNoteColor(id: string, color: string) {
    void updateNote(id, {
      color,
      updatedAt: serverTimestamp(),
    })
  }

  function handleDeleteNote(id: string) {
    void deleteNote(id)
  }

  function handleCanvasPointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect()
    setCursor(event.clientX - rect.left, event.clientY - rect.top)
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

  const peopleCount = peers.length + 1

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

      <div className="presence-bar" aria-live="polite">
        <span>
          {peopleCount} on this board · you are {displayName}
        </span>
        {peers.length > 0 && (
          <ul className="presence-list">
            {peers.map((peer) => (
              <li key={peer.clientId}>{peer.displayName}</li>
            ))}
          </ul>
        )}
      </div>

      {copyStatus && <p className="board-status">{copyStatus}</p>}
      {loading && <p className="board-status">Loading board…</p>}
      {error && (
        <p className="board-error" role="alert">
          Could not load board: {error.message}
        </p>
      )}

      <div
        className="board-canvas"
        onPointerMove={handleCanvasPointerMove}
      >
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
              onFocusNote={() => setActiveNoteId(note.id)}
              onBlurNote={() => setActiveNoteId(null)}
            />
          ))}

        {peers.map((peer) =>
          peer.cursorX != null && peer.cursorY != null ? (
            <div
              key={`cursor-${peer.clientId}`}
              className="remote-cursor"
              style={{ left: peer.cursorX, top: peer.cursorY }}
              title={peer.displayName}
            >
              <span className="remote-cursor-label">{peer.displayName}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
