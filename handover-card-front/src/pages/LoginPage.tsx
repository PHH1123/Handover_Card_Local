import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { auth } from '../api/endpoints'
import type { SocialProviderResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { buildAuthorizationUrl } from '../lib/oauth'
import { ProviderMark } from '../components/ProviderMark'
import { useT } from '../i18n/LanguageContext'
import { LanguageToggle } from '../i18n/LanguageToggle'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const { login, signup } = useAuth()
  const t = useT()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [providers, setProviders] = useState<SocialProviderResponse[]>([])

  // 서버에 설정된 공급자만 버튼으로 띄운다. 실패하면 이메일 로그인만 보여주면 되므로 조용히 넘긴다.
  useEffect(() => {
    let cancelled = false
    auth
      .socialProviders()
      .then((list) => {
        if (!cancelled) setProviders(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    if (mode === 'signup' && password.length < 8) {
      setError(t.login.errorShortPassword)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(email, password, name)
      }
      // 로그인에 성공하면 AuthProvider 의 user 가 채워지고 App 이 알아서 홈으로 넘긴다.
    } catch (caught) {
      const fallback = mode === 'login' ? t.login.errorLogin : t.login.errorSignup
      setError(caught instanceof ApiError ? caught.message : fallback)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-main app-main--narrow">
      {/* 로그인 화면은 헤더 밖이라 언어 전환을 여기에도 둔다 */}
      <div className="login-top">
        <h1 className="login-brand">Handover Card</h1>
        <LanguageToggle />
      </div>

      <div className="panel">
        <h2 className="login-heading">{t.login.heading(mode === 'signup')}</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert--error form-alert" role="alert">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div className="field">
              <label className="field-label" htmlFor="name">
                {t.login.name}
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder={t.login.namePlaceholder}
                required
              />
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="email">
              {t.login.email}
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder={t.login.emailPlaceholder}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              {t.login.password}
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {mode === 'signup' && <span className="field-hint">{t.login.passwordHint}</span>}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg login-submit"
            disabled={submitting}
          >
            {submitting && <span className="spinner" />}
            {t.login.submit(mode === 'signup')}
          </button>
        </form>

        {providers.length > 0 && (
          <>
            <div className="divider">{t.login.or}</div>
            <div className="social-row">
              {providers.map((provider) => (
                <button
                  key={provider.provider}
                  type="button"
                  className="btn btn--block social-btn"
                  disabled={submitting}
                  onClick={() => {
                    // 공급자 인가 화면으로 떠난다. 돌아오는 곳은 /oauth2/callback/{provider}.
                    window.location.href = buildAuthorizationUrl(provider)
                  }}
                >
                  <ProviderMark provider={provider.provider} />
                  {t.login.continueWith(provider.displayName)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 이미지대로 패널 안 맨 아래에 둔다 */}
        <p className="login-switch">
          {mode === 'login' ? t.login.switchToSignup : t.login.switchToLogin}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? t.login.signupLink : t.login.loginLink}
          </button>
        </p>
      </div>
    </main>
  )
}
