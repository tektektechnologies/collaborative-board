import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { onSnapshot, serverTimestamp } from 'firebase/firestore'
import { boardDoc } from '../firebase'
import { useBoard } from '../hooks/useBoard'
import { usePresence, type Presence } from '../hooks/usePresence'
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

const PRESENCE_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
]

function presenceColor(clientId: string): string {
  let hash = 0
  for (let i = 0; i < clientId.length; i += 1) {
    hash = (hash + clientId.charCodeAt(i) * (i + 1)) % PRESENCE_COLORS.length
  }
  return PRESENCE_COLORS[hash]
}

/** Short label for cursors / chips, e.g. "Guest a3f2" → "Ga3f" */
function presenceLabel(displayName: string): string {
  const compact = displayName.replace(/\s+/g, '')
  return compact.slice(0, 4)
}

function presenceSummary(peerCount: number): string {
  if (peerCount === 0) return 'Only you are here'
  if (peerCount === 1) return 'You and 1 other are here'
  return `${peerCount + 1} people on this board`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { notes, loading, error, addNote, updateNote, deleteNote } = useBoard(
    boardId ?? null,
  )
  const { clientId, displayName, peers, setCursor, setActiveNoteId } =
    usePresence(boardId ?? null)
  const [copyStatus, setCopyStatus] = useState('')
  const [hostClientId, setHostClientId] = useState<string | null>(null)

  useEffect(() => {
    if (!boardId) {
      setHostClientId(null)
      return
    }

    const unsubscribe = onSnapshot(boardDoc(boardId), (snapshot) => {
      const data = snapshot.data()
      setHostClientId(
        typeof data?.hostClientId === 'string' ? data.hostClientId : null,
      )
    })

    return unsubscribe
  }, [boardId])

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
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = clamp(event.clientX - rect.left, 0, canvas.clientWidth)
    const y = clamp(event.clientY - rect.top, 0, canvas.clientHeight)
    setCursor(x, y)
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

  function presenceChipLabel(person: {
    clientId: string
    displayName: string
    isSelf?: boolean
  }) {
    if (hostClientId && person.clientId === hostClientId) {
      return 'Host'
    }
    if (person.isSelf) {
      return `You (${presenceLabel(person.displayName)})`
    }
    return person.displayName
  }

  function renderPresenceChip(person: {
    clientId: string
    displayName: string
    isSelf?: boolean
  }) {
    const color = presenceColor(person.clientId)
    return (
      <li key={person.clientId} className="presence-chip" title={person.displayName}>
        <span className="presence-dot" style={{ backgroundColor: color }} />
        <span>{presenceChipLabel(person)}</span>
      </li>
    )
  }

  function renderRemoteCursor(peer: Presence) {
    if (peer.cursorX == null || peer.cursorY == null) return null

    const color = presenceColor(peer.clientId)
    const isHost = hostClientId === peer.clientId
    const label = isHost ? 'Host' : presenceLabel(peer.displayName)

    return (
      <div
        key={`cursor-${peer.clientId}`}
        className="remote-cursor"
        style={{
          left: peer.cursorX,
          top: peer.cursorY,
          backgroundColor: color,
        }}
        title={isHost ? 'Host' : peer.displayName}
      >
        <span className="remote-cursor-label" style={{ backgroundColor: color }}>
          {label}
        </span>
      </div>
    )
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

      <div className="presence-bar" aria-live="polite">
        <strong className="presence-summary">{presenceSummary(peers.length)}</strong>
        <ul className="presence-list">
          {renderPresenceChip({
            clientId,
            displayName,
            isSelf: true,
          })}
          {peers.map((peer) =>
            renderPresenceChip({
              clientId: peer.clientId,
              displayName: peer.displayName,
            }),
          )}
        </ul>
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

        {peers.map((peer) => renderRemoteCursor(peer))}
      </div>
    </div>
  )
}
