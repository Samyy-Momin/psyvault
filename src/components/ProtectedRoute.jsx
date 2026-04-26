import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const { user, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <main className="page-shell">
        <div className="status">Checking your session…</div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
