import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

const HomePage = lazy(() => import('./pages/HomePage'))
const BooksPage = lazy(() => import('./pages/BooksPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const QuotesPage = lazy(() => import('./pages/QuotesPage'))
const ReaderPage = lazy(() => import('./pages/ReaderPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))

function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <main className="page-shell">
            <div className="status">Loading…</div>
          </main>
        }
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/quotes" element={<QuotesPage />} />
            <Route path="/reader/:id" element={<ReaderPage />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/books"
              element={
                <ProtectedRoute>
                  <BooksPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
