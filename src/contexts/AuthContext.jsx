import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { AuthContext } from './auth-context'
import { auth } from '../lib/firebase'
import { loginWithEmail, logoutUser } from '../services/auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      authReady,
      login: loginWithEmail,
      logout: logoutUser,
    }),
    [authReady, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
