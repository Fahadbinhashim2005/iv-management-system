
import './App.css'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'

function App() {
  const isDashboardPreview = true

  return (
    <>
      {isDashboardPreview ? (
        <StudentDashboard />
      ) : (
        <Login />
      )}
    </>
  )
}

export default App
