import { messages } from '../i18n/messages'
import { tokenStore } from './tokens'
import type { TokenResponse } from './types'

/**
 * 비어 있으면 same-origin("/api/...")으로 요청하고, 개발 중에는 vite.config.ts 의
 * 프록시가 백엔드로 전달한다. 배포 시에만 VITE_API_BASE_URL 을 채운다.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * API 가 에러 응답 본문 형식을 명세하지 않아서(모든 엔드포인트가 200 만 정의) 흔한
 * 형태들을 순서대로 훑어본다. 아무것도 못 찾으면 상태 코드별 기본 문구로 떨어진다.
 */
function extractMessage(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim()) return body.trim()

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    for (const key of ['message', 'error', 'detail', 'title']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }

  const fallbacks = messages().api
  return fallbacks[status as keyof typeof fallbacks] ?? `HTTP ${status}`
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** 리프레시 요청이 동시에 여러 번 나가지 않도록 진행 중인 요청을 공유한다. */
let refreshInFlight: Promise<TokenResponse> | null = null

/** 401 로 세션이 끊겼을 때 앱에 알리는 콜백 (AuthProvider 가 등록한다). */
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler
}

async function refreshTokens(): Promise<TokenResponse> {
  const stored = tokenStore.get()
  if (!stored) throw new ApiError(401, messages().api.loginRequired, null)

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: stored.refreshToken }),
  })

  if (!res.ok) {
    const body = await parseBody(res)
    throw new ApiError(res.status, extractMessage(res.status, body), body)
  }

  const tokens = (await res.json()) as TokenResponse
  tokenStore.save(tokens)
  return tokens
}

interface RequestOptions {
  method?: string
  /** JSON 본문. body 와 함께 쓰지 않는다. */
  json?: unknown
  /** FormData 등 그대로 보낼 본문. Content-Type 은 브라우저가 정한다. */
  body?: BodyInit
  query?: Record<string, string | number | boolean | undefined | null>
  /** 인증 헤더를 붙이지 않는다 (로그인/회원가입용). */
  anonymous?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }

  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function rawRequest(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const headers = new Headers()
  if (options.json !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    signal: options.signal,
  })
}

/**
 * 모든 API 호출의 공통 진입점.
 * 액세스 토큰을 붙이고, 401 이면 리프레시 후 한 번만 재시도한다.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const stored = options.anonymous ? null : tokenStore.get()
  let res = await rawRequest(path, options, stored?.accessToken ?? null)

  if (res.status === 401 && !options.anonymous && stored) {
    try {
      refreshInFlight ??= refreshTokens().finally(() => {
        refreshInFlight = null
      })
      const refreshed = await refreshInFlight
      res = await rawRequest(path, options, refreshed.accessToken)
    } catch {
      // 리프레시 토큰까지 만료된 경우: 저장된 토큰을 버리고 로그인 화면으로 보낸다.
      tokenStore.clear()
      onSessionExpired?.()
      throw new ApiError(401, messages().api.sessionExpired, null)
    }
  }

  if (!res.ok) {
    const body = await parseBody(res)
    throw new ApiError(res.status, extractMessage(res.status, body), body)
  }

  if (res.status === 204) return undefined as T
  const body = await parseBody(res)
  return body as T
}
