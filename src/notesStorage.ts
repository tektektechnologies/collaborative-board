export type Note = {
  id: string
  x: number
  y: number
  text: string
  color: string
}

function notesStorageKey(boardId: string) {
  return `board:${boardId}:notes`
}

export function loadNotes(boardId: string): Note[] {
  try {
    const raw = localStorage.getItem(notesStorageKey(boardId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Note[]) : []
  } catch {
    return []
  }
}

export function saveNotes(boardId: string, notes: Note[]) {
  localStorage.setItem(notesStorageKey(boardId), JSON.stringify(notes))
}
