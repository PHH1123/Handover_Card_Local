import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n/LanguageContext'
import { consumeState, redirectUriFor } from '../lib/oauth'

/**
 * 공급자가 인가 코드를 붙여 되돌려보내는 착지점.
 * state 를 검증한 뒤 코드를 서버에 넘겨 토큰으로 교환한다.
 * 성공하면 AuthProvider 의 user 가 채워지고 App 이 홈으로 넘긴다.
 */
export function OAuthCallbackPage() {
  const { provider = '' } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const { socialLogin } = useAuth()
  const t = useT()
  const [error, setError] = useState<string | null>(null)

  // 인가 코드는 한 번만 쓸 수 있다. StrictMode 이중 실행으로 두 번 교환하지 않도록 막는다.
  const exchangedRef = useRef(false)

  useEffect(() => {
    if (exchangedRef.current) return
    exchangedRef.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const denied = searchParams.get('error')

    if (denied) {
      setError(denied === 'access_denied' ? t.oauth.cancelled : t.oauth.rejected(denied))
      return
    }
    if (!code) {
      setError(t.oauth.noCode)
      return
    }
    if (!consumeState(provider, state)) {
      setError(t.oauth.badState)
      return
    }

    socialLogin(provider, code, redirectUriFor(provider)).catch((caught) => {
      setError(caught instanceof ApiError ? caught.message : t.oauth.failed)
    })
  }, [provider, searchParams, socialLogin, t])

  if (error) {
    return (
      <main className="app-main app-main--narrow">
        <div className="panel">
          <div className="alert alert--error" role="alert">
            {error}
          </div>
          <Link to="/login" className="btn btn--block" style={{ marginTop: 16 }}>
            {t.oauth.toLogin}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div className="center-screen">
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" />
        <p className="muted" style={{ marginTop: 14 }}>
          {t.oauth.working}
        </p>
      </div>
    </div>
  )
}
