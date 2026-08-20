import type { SocialProviderResponse } from '../api/types'

/**
 * 소셜 로그인 인가 요청을 만드는 쪽은 프론트다. 서버는 공급자 정보(authorizationUri,
 * clientId, scopes)만 내려주고, 인가 URL 조립과 state 검증은 클라이언트가 해야 한다고
 * 명세에 못박혀 있다. (POST /api/auth/oauth2/{provider} 설명 참고)
 */

const STATE_KEY_PREFIX = 'hc.oauthState.'

/** 공급자 콜백을 받을 주소. 인가 요청과 토큰 교환에서 완전히 같은 값을 써야 한다. */
export function redirectUriFor(provider: string): string {
  return `${window.location.origin}/oauth2/callback/${provider}`
}

function createState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 인가 URL 을 만들고 state 를 저장한다.
 * state 는 sessionStorage 에 두어 이 탭에서 시작한 요청만 유효하게 한다.
 */
export function buildAuthorizationUrl(provider: SocialProviderResponse): string {
  const state = createState()
  sessionStorage.setItem(STATE_KEY_PREFIX + provider.provider, state)

  const url = new URL(provider.authorizationUri)
  url.searchParams.set('client_id', provider.clientId)
  url.searchParams.set('redirect_uri', redirectUriFor(provider.provider))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  if (provider.scopes.length > 0) url.searchParams.set('scope', provider.scopes.join(' '))

  return url.toString()
}

/**
 * 콜백으로 돌아온 state 가 우리가 보낸 것과 같은지 확인한다.
 * 한 번 쓰면 지워서 재사용을 막는다.
 */
export function consumeState(provider: string, returned: string | null): boolean {
  const key = STATE_KEY_PREFIX + provider
  const expected = sessionStorage.getItem(key)
  sessionStorage.removeItem(key)
  return Boolean(expected) && expected === returned
}
