import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n/LanguageContext'
import { LanguageToggle } from '../i18n/LanguageToggle'

/** 홈의 남기기 블록. 헤더 버튼이 이 자리로 내려간다. */
export const COMPOSE_ANCHOR = 'compose'

export function scrollToCompose() {
  const target = document.getElementById(COMPOSE_ANCHOR)
  if (!target) return

  // 멈추는 위치는 .compose 의 scroll-margin-top 이 잡는다 (헤더 높이만큼 비켜 준다).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  const navItems = [
    { to: '/', label: t.nav.cards },
    { to: '/team', label: t.nav.team },
    { to: '/settings', label: t.nav.settings },
  ]

  /*
   * 화면을 옮기면 위에서 시작해야 한다. 브라우저는 스크롤 위치를 그대로 두기 때문에,
   * 아래쪽 링크(예: 남기기 블록의 「설정」)를 누르면 새 화면이 중간부터 보인다.
   * 남기기 자리로 내려가라는 요청이 실려 있을 때만 건너뛴다.
   */
  useEffect(() => {
    const state = location.state as { scrollToCompose?: boolean } | null
    if (state?.scrollToCompose) return
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  // 홈에 있으면 페이지를 옮기지 않고 남기기 자리로만 내려간다.
  // 다른 화면이면 홈으로 보내고, 그린 뒤에 내려가라고 state 로 알려 준다.
  function handleCompose() {
    if (location.pathname === '/') {
      scrollToCompose()
    } else {
      navigate('/', { state: { scrollToCompose: true } })
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          Handover Card
        </Link>

        {/*
         * 탭과 언어 전환을 한 묶음으로 싼다. 좁은 화면에서 둘이 함께 아랫줄로 내려가고,
         * 그 줄의 폭을 자기들끼리 나눠 쓴다 (윗줄 버튼 폭에 끌려다니지 않는다).
         * 넓은 화면에서는 이 묶음이 display:contents 로 사라져 예전과 같은 한 줄이 된다.
         */}
        <div className="app-subbar">
          <nav className="app-tabs">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `app-tab${isActive ? ' app-tab--active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <LanguageToggle />
        </div>

        <div className="app-nav">
          {user && <span className="app-nav-user">{user.name}</span>}
          <button type="button" className="btn btn--primary" onClick={handleCompose}>
            {t.nav.newCard}
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>
            {t.nav.logout}
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  )
}
