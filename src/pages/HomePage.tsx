import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoards } from '../hooks/useBoards'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const {
    boards,
    loading,
    error,
    createBoard,
    renameBoard,
    deleteBoard,
    currentClientId,
  } = useBoards()
  const [isCreating, setIsCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleCreateBoard() {
    setIsCreating(true)
    setCreateError(null)
    try {
      const boardId = await createBoard()
      navigate(`/board/${boardId}`)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Could not create board',
      )
      setIsCreating(false)
    }
  }

  async function handleRenameBoard(
    event: React.MouseEvent<HTMLButtonElement>,
    boardId: string,
    currentName: string,
  ) {
    event.preventDefault()
    event.stopPropagation()

    const nextName = window.prompt('Rename board', currentName)
    if (nextName == null) return

    setRenamingId(boardId)
    setActionError(null)
    try {
      await renameBoard(boardId, nextName)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not rename board',
      )
    } finally {
      setRenamingId(null)
    }
  }

  async function handleDeleteBoard(
    event: React.MouseEvent<HTMLButtonElement>,
    boardId: string,
  ) {
    event.preventDefault()
    event.stopPropagation()

    const confirmed = window.confirm(
      'Delete this board and all of its notes? This cannot be undone.',
    )
    if (!confirmed) return

    setDeletingId(boardId)
    setActionError(null)
    try {
      await deleteBoard(boardId)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete board',
      )
    } finally {
      setDeletingId(null)
    }
  }

  function hostLabel(board: {
    hostClientId: string | null
    hostDisplayName: string | null
  }) {
    if (!board.hostDisplayName && !board.hostClientId) {
      return 'Host: unknown'
    }

    if (board.hostClientId === currentClientId) {
      return 'Host'
    }

    return 'Host'
  }

  return (
    <div className="home-page">
      <h1>Collaborative Board</h1>
      <p>Create a board, then share the URL so others can collaborate in real time.</p>
      <button type="button" onClick={handleCreateBoard} disabled={isCreating}>
        {isCreating ? 'Creating…' : 'Create board'}
      </button>

      {createError && (
        <p className="home-error" role="alert">
          {createError}
        </p>
      )}
      {actionError && (
        <p className="home-error" role="alert">
          {actionError}
        </p>
      )}
      {error && (
        <p className="home-error" role="alert">
          Could not load boards: {error.message}
        </p>
      )}

      <section className="board-list-section">
        <h2>Your boards</h2>
        {loading && <p>Loading boards…</p>}
        {!loading && !error && boards.length === 0 && (
          <p className="board-list-empty">No boards yet. Create one to get started.</p>
        )}
        {!loading && boards.length > 0 && (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id} className="board-list-row">
                <Link to={`/board/${board.id}`} className="board-list-item">
                  <span className="board-list-name">{board.name}</span>
                  <span className="board-list-id">{board.id}</span>
                  <span className="board-list-meta">
                    <span className="board-host">{hostLabel(board)}</span>
                    {' · '}
                    {board.noteCount} note{board.noteCount === 1 ? '' : 's'}
                    {board.createdAt
                      ? ` · ${board.createdAt.toLocaleString()}`
                      : ''}
                  </span>
                </Link>
                <div className="board-list-actions">
                  <button
                    type="button"
                    className="board-rename"
                    disabled={renamingId === board.id || deletingId === board.id}
                    onClick={(event) =>
                      handleRenameBoard(event, board.id, board.name)
                    }
                  >
                    {renamingId === board.id ? 'Saving…' : 'Rename'}
                  </button>
                  <button
                    type="button"
                    className="board-delete"
                    disabled={deletingId === board.id || renamingId === board.id}
                    onClick={(event) => handleDeleteBoard(event, board.id)}
                  >
                    {deletingId === board.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
