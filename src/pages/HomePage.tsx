import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoards } from '../hooks/useBoards'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { boards, loading, error, createBoard } = useBoards()
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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
              <li key={board.id}>
                <Link to={`/board/${board.id}`} className="board-list-item">
                  <span className="board-list-id">{board.id}</span>
                  <span className="board-list-meta">
                    {board.noteCount} note{board.noteCount === 1 ? '' : 's'}
                    {board.createdAt
                      ? ` · ${board.createdAt.toLocaleString()}`
                      : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
