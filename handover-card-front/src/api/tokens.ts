import type { TokenResponse } from './types'

const ACCESS_KEY = 'hc.accessToken'
const REFRESH_KEY = 'hc.refreshToken'

export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

/**
 * 토큰 저장소. localStorage 를 쓰므로 새로고침해도 로그인이 유지된다.
 * (XSS 에 취약한 방식이지만 리프레시 토큰을 httpOnly 쿠키로 내려주는 API 가 아니라
 *  선택지가 없다. 해커톤 데모 범위에서는 이 방식으로 간다.)
 */
export const tokenStore = {
  get(): StoredTokens | null {
    const accessToken = localStorage.getItem(ACCESS_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
  },

  save(tokens: TokenResponse | StoredTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
