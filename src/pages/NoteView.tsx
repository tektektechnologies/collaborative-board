import { useEffect, useRef, useState } from 'react'
import { NOTE_COLORS, type Note } from './BoardPage'

type NoteViewProps = {
  note: Note
  onMove: (id: string, x: number, y: number) => void
  onUpdateText: (id: string, text: string) => void
  onUpdateColor: (id: string, color: string) => void
}

export default function NoteView({
  note,
  onMove,
  onUpdateText,
  onUpdateColor,
}: NoteViewProps) {
  const noteRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: note.x, y: note.y })
  const [text, setText] = useState(note.text)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isDraggingRef.current) {
      setPosition({ x: note.x, y: note.y })
    }
  }, [note.x, note.y])

  useEffect(() => {
    setText(note.text)
  }, [note.text])

  function getCanvasLocalPoint(event: React.PointerEvent<HTMLElement>) {
    const noteEl = noteRef.current
    if (!noteEl?.offsetParent) {
      return { x: 0, y: 0 }
    }
    const canvasRect = (noteEl.offsetParent as HTMLElement).getBoundingClientRect()
    return {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    }
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
    const local = getCanvasLocalPoint(event)
    setPosition({
      x: local.x - offsetRef.current.x,
      y: local.y - offsetRef.current.y,
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    const local = getCanvasLocalPoint(event)
    const x = local.x - offsetRef.current.x
    const y = local.y - offsetRef.current.y
    isDraggingRef.current = false
    setPosition({ x, y })
    setIsDragging(false)
    onMove(note.id, x, y)
  }

  function commitText() {
    if (text !== note.text) {
      onUpdateText(note.id, text)
    }
  }

  function handleTextKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  return (
    <div
      ref={noteRef}
      className={`note${isDragging ? ' note--dragging' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: note.color,
      }}
    >
      <div
        className="note-drag-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commitText}
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
