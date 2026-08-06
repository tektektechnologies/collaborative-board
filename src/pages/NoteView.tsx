import { useEffect, useRef, useState } from 'react'
import { NOTE_COLORS } from './BoardPage'
import type { Note } from '../types'

const NOTE_WIDTH = 200
const NOTE_HEIGHT = 200

// Push text to Firestore while typing so other clients see updates quickly.
// Still commit immediately on blur / Enter.
const TEXT_SYNC_DEBOUNCE_MS = 250

type NoteViewProps = {
  note: Note
  onMove: (id: string, x: number, y: number) => void
  onUpdateText: (id: string, text: string) => void
  onUpdateColor: (id: string, color: string) => void
  onDelete: (id: string) => void
  onFocusNote?: () => void
  onBlurNote?: () => void
}

function clampPosition(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const maxX = Math.max(0, canvasWidth - NOTE_WIDTH)
  const maxY = Math.max(0, canvasHeight - NOTE_HEIGHT)
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  }
}

export default function NoteView({
  note,
  onMove,
  onUpdateText,
  onUpdateColor,
  onDelete,
  onFocusNote,
  onBlurNote,
}: NoteViewProps) {
  const noteRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: note.x, y: note.y })
  const [text, setText] = useState(note.text)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const isEditingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const textRef = useRef(note.text)
  const lastSentTextRef = useRef(note.text)
  const syncTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isDraggingRef.current) {
      setPosition({ x: note.x, y: note.y })
    }
  }, [note.x, note.y])

  // Don't clobber the caret while this client is actively typing.
  useEffect(() => {
    if (!isEditingRef.current) {
      setText(note.text)
      textRef.current = note.text
      lastSentTextRef.current = note.text
    }
  }, [note.text])

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current != null) {
        window.clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  function getCanvasSize() {
    const canvas = noteRef.current?.offsetParent as HTMLElement | null
    if (!canvas) {
      return { width: 0, height: 0 }
    }
    return { width: canvas.clientWidth, height: canvas.clientHeight }
  }

  function getCanvasLocalPoint(event: React.PointerEvent<HTMLElement>) {
    const noteEl = noteRef.current
    if (!noteEl?.offsetParent) {
      return { x: 0, y: 0 }
    }
    const canvasRect = (
      noteEl.offsetParent as HTMLElement
    ).getBoundingClientRect()
    return {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    }
  }

  function positionFromPointer(event: React.PointerEvent<HTMLElement>) {
    const local = getCanvasLocalPoint(event)
    const { width, height } = getCanvasSize()
    return clampPosition(
      local.x - offsetRef.current.x,
      local.y - offsetRef.current.y,
      width,
      height,
    )
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const local = getCanvasLocalPoint(event)
    offsetRef.current = {
      x: local.x - position.x,
      y: local.y - position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    isDraggingRef.current = true
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    setPosition(positionFromPointer(event))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    const next = positionFromPointer(event)
    isDraggingRef.current = false
    setPosition(next)
    setIsDragging(false)
    onMove(note.id, next.x, next.y)
  }

  function flushText(nextText: string = textRef.current) {
    if (syncTimeoutRef.current != null) {
      window.clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
    if (nextText !== lastSentTextRef.current) {
      lastSentTextRef.current = nextText
      onUpdateText(note.id, nextText)
    }
  }

  function scheduleTextSync(nextText: string) {
    if (syncTimeoutRef.current != null) {
      window.clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null
      if (nextText !== lastSentTextRef.current) {
        lastSentTextRef.current = nextText
        onUpdateText(note.id, nextText)
      }
    }, TEXT_SYNC_DEBOUNCE_MS)
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextText = event.target.value
    textRef.current = nextText
    setText(nextText)
    scheduleTextSync(nextText)
  }

  function handleTextKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  const updatedAtLabel = note.updatedAt
    ? `Last updated: ${note.updatedAt.toLocaleString()}`
    : 'Not updated yet'

  return (
    <div
      ref={noteRef}
      className={`note${isDragging ? ' note--dragging' : ''}`}
      title={updatedAtLabel}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: note.color,
      }}
    >
      <div className="note-toolbar">
        <div
          className="note-drag-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        <button
          type="button"
          className="note-delete"
          aria-label="Delete note"
          title="Delete note"
          onClick={() => onDelete(note.id)}
        >
          ×
        </button>
      </div>
      <textarea
        value={text}
        onChange={handleTextChange}
        onFocus={() => {
          isEditingRef.current = true
          onFocusNote?.()
        }}
        onBlur={() => {
          isEditingRef.current = false
          flushText()
          onBlurNote?.()
        }}
        onKeyDown={handleTextKeyDown}
      />
      <div className="note-color-swatches" role="group" aria-label="Note color">
        {NOTE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`note-color-swatch${note.color === color ? ' note-color-swatch--selected' : ''}`}
            style={{ backgroundColor: color }}
            aria-label={`Set color ${color}`}
            aria-pressed={note.color === color}
            onClick={() => onUpdateColor(note.id, color)}
          />
        ))}
      </div>
    </div>
  )
}
