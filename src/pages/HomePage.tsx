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
    deleteBoard,
    currentClientId,
  } = useBoards()
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    setDeleteError(null)
    try {
      await deleteBoard(boardId)
    } catch (err) {
      setDeleteError(
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

    return `Host: ${board.hostDisplayName ?? 'Unknown'}`
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
      {deleteError && (
        <p className="home-error" role="alert">
          {deleteError}
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
                <button
                  type="button"
                  className="board-delete"
                  disabled={deletingId === board.id}
                  onClick={(event) => handleDeleteBoard(event, board.id)}
                >
                  {deletingId === board.id ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
