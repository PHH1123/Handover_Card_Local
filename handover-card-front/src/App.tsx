import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppLayout } from './components/AppLayout'
import { CardDetailPage } from './pages/CardDetailPage'
import { CardListPage } from './pages/CardListPage'
import { LoginPage } from './pages/LoginPage'
import { NewCardPage } from './pages/NewCardPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamPage } from './pages/TeamPage'

export default function App() {
  const { loading, user } = useAuth()

  // 저장된 토큰으로 프로필을 복구하는 동안에는 라우팅 판단을 미룬다.
  if (loading) {
    return (
      <div className="center-screen">
        <span className="spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 소셜 로그인 콜백은 로그인 전에 열려야 한다. */}
        <Route path="/oauth2/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<CardListPage />} />
        <Route path="/cards/new" element={<NewCardPage />} />
        <Route path="/cards/:id" element={<CardDetailPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}
