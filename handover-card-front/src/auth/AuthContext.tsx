import { createContext, useContext } from 'react'
import type { MemberProfileResponse } from '../api/types'

export interface AuthState {
  /** 프로필을 아직 불러오는 중이면 true. 초기 렌더에서 로그인 화면이 깜빡이는 걸 막는다. */
  loading: boolean
  user: MemberProfileResponse | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  /** 공급자에게 받은 인가 코드를 토큰으로 교환해 로그인한다. */
  socialLogin: (provider: string, code: string, redirectUri: string) => Promise<void>
  logout: () => Promise<void>
  /** 프로필을 서버에서 다시 읽어 화면에 반영한다 (이름 변경 후 등). */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
