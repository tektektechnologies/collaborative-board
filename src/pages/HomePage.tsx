import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  function handleCreateBoard() {
    const boardId = crypto.randomUUID()
    navigate(`/board/${boardId}`)
  }

  return (
    <div>
      <h1>Collaborative Board</h1>
      <button type="button" onClick={handleCreateBoard}>
        Create board
      </button>
    </div>
  )
}
