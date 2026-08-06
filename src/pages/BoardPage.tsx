import { useParams } from 'react-router-dom'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()

  return <h1>Board: {boardId}</h1>
}
