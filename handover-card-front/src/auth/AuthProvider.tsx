import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setSessionExpiredHandler } from '../api/client'
import { auth, members } from '../api/endpoints'
import { tokenStore } from '../api/tokens'
import type { MemberProfileResponse } from '../api/types'
import { AuthContext, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MemberProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 새로고침 후에도 저장된 토큰이 살아 있으면 프로필을 다시 불러와 로그인 상태를 복구한다.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!tokenStore.get()) {
        setLoading(false)
        return
      }
      try {
        const profile = await members.me()
        if (!cancelled) setUser(profile)
      } catch {
        tokenStore.clear()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  // 리프레시까지 실패해 세션이 끊기면 클라이언트가 이 콜백으로 알려준다.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    return () => setSessionExpiredHandler(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await auth.login({ email, password })
    tokenStore.save(tokens)
    setUser(await members.me())
  }, [])

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      await auth.signup({ email, password, name })
      // 가입 API 는 토큰을 주지 않으므로 곧바로 로그인까지 이어서 처리한다.
      await login(email, password)
    },
    [login],
  )

  const socialLogin = useCallback(async (provider: string, code: string, redirectUri: string) => {
    const tokens = await auth.socialLogin(provider, code, redirectUri)
    tokenStore.save(tokens)
    setUser(await members.me())
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await members.me())
  }, [])

  const logout = useCallback(async () => {
    const stored = tokenStore.get()
    if (stored) {
      // 서버 폐기에 실패하더라도 로컬 로그아웃은 반드시 진행한다.
      await auth.logout(stored.refreshToken).catch(() => undefined)
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ loading, user, login, signup, socialLogin, logout, refreshUser }),
    [loading, user, login, signup, socialLogin, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
