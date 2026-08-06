import { useNavigate } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()

  function handleCreateBoard() {
    const boardId = crypto.randomUUID()
    navigate(`/board/${boardId}`)
  }

  return (
    <div className="home-page">
      <h1>Collaborative Board</h1>
      <p>Create a board, then share the URL so others can collaborate in real time.</p>
      <button type="button" onClick={handleCreateBoard}>
        Create board
      </button>
    </div>
  )
}
