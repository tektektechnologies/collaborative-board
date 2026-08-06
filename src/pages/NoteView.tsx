import { useEffect, useRef, useState } from 'react'
import type { Note } from './BoardPage'

type NoteViewProps = {
  note: Note
  onMove: (id: string, x: number, y: number) => void
}

export default function NoteView({ note, onMove }: NoteViewProps) {
  const [position, setPosition] = useState({ x: note.x, y: note.y })
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isDraggingRef.current) {
      setPosition({ x: note.x, y: note.y })
    }
  }, [note.x, note.y])

  function getCanvasLocalPoint(
    event: React.PointerEvent<HTMLDivElement>,
    noteEl: HTMLDivElement,
  ) {
    const canvas = noteEl.offsetParent as HTMLElement
    const canvasRect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const noteEl = event.currentTarget
    const local = getCanvasLocalPoint(event, noteEl)
    offsetRef.current = {
      x: local.x - position.x,
      y: local.y - position.y,
    }
    noteEl.setPointerCapture(event.pointerId)
    isDraggingRef.current = true
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    const local = getCanvasLocalPoint(event, event.currentTarget)
    setPosition({
      x: local.x - offsetRef.current.x,
      y: local.y - offsetRef.current.y,
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    const local = getCanvasLocalPoint(event, event.currentTarget)
    const x = local.x - offsetRef.current.x
    const y = local.y - offsetRef.current.y
    isDraggingRef.current = false
    setPosition({ x, y })
    setIsDragging(false)
    onMove(note.id, x, y)
  }

  return (
    <div
      className={`note${isDragging ? ' note--dragging' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: note.color,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <textarea value={note.text} readOnly />
    </div>
  )
}
