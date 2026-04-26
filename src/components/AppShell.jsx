import { Outlet } from 'react-router-dom'

function AppShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  )
}

export default AppShell
