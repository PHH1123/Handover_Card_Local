import { ApiError, request } from './client'
import type {
  CreateHandoverCardParams,
  HandoverCardCreatedResponse,
  HandoverCardResponse,
  JoinRequestResponse,
  LoginRequest,
  MemberLookupResult,
  MemberProfileResponse,
  MemberResponse,
  PageResponse,
  SignupRequest,
  SocialProviderResponse,
  TeamDetailResponse,
  TeamResponse,
  TokenResponse,
  UpdateHandoverResultRequest,
} from './types'

// ---------- 인증 ----------

export const auth = {
  signup: (payload: SignupRequest) =>
    request<MemberResponse>('/api/auth/signup', { method: 'POST', json: payload, anonymous: true }),

  login: (payload: LoginRequest) =>
    request<TokenResponse>('/api/auth/login', { method: 'POST', json: payload, anonymous: true }),

  refresh: (refreshToken: string) =>
    request<TokenResponse>('/api/auth/refresh', { method: 'POST', json: { refreshToken }, anonymous: true }),

  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', { method: 'POST', json: { refreshToken } }),

  socialProviders: () =>
    request<SocialProviderResponse[]>('/api/auth/oauth2/providers', { anonymous: true }),

  /**
   * 공급자에게 받은 인가 코드를 토큰으로 교환한다.
   * redirectUri 는 인가 요청에 사용한 값과 정확히 같아야 한다.
   */
  socialLogin: (provider: string, code: string, redirectUri: string) =>
    request<TokenResponse>(`/api/auth/oauth2/${provider}`, {
      method: 'POST',
      json: { code, redirectUri },
      anonymous: true,
    }),
}

// ---------- 회원 / 팀 ----------

export const members = {
  me: () => request<MemberProfileResponse>('/api/members/me'),

  updateName: (name: string) =>
    request<MemberProfileResponse>('/api/members/me', { method: 'PATCH', json: { name } }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/members/me/password', {
      method: 'PUT',
      json: { currentPassword, newPassword },
    }),

  /** 계정과 함께 보유한 카드·토큰이 삭제된다. 수신자로 연결된 남의 카드는 연결만 해제됨. */
  deleteAccount: () => request<void>('/api/members/me', { method: 'DELETE' }),

  /** 같은 팀 회원 이름으로 이메일 찾기. 이름은 완전 일치, 두 글자 미만이면 빈 목록. */
  lookup: (name: string) =>
    request<MemberLookupResult>('/api/members/lookup', { query: { name } }),
}

export const teams = {
  /** 가입 신청 대상을 고르기 위한 전체 팀 목록 */
  list: () => request<TeamResponse[]>('/api/teams'),

  create: (name: string) => request<TeamResponse>('/api/teams', { method: 'POST', json: { name } }),

  /** 소속된 팀이 없으면 404 를 던진다. */
  myTeam: () => request<TeamDetailResponse>('/api/teams/me'),

  /** 팀장만 가능. 모든 팀원의 소속이 해제된다. 카드는 영향받지 않음. */
  remove: () => request<void>('/api/teams/me', { method: 'DELETE' }),

  /** 팀장은 나갈 수 없다 (409). 먼저 위임하거나 팀을 삭제해야 한다. */
  leave: () => request<void>('/api/teams/me/membership', { method: 'DELETE' }),

  transferLeadership: (memberId: number) =>
    request<void>('/api/teams/me/leader', { method: 'PUT', json: { memberId } }),

  kickMember: (memberId: number) =>
    request<void>(`/api/teams/me/members/${memberId}`, { method: 'DELETE' }),

  apply: (teamId: number) =>
    request<void>(`/api/teams/${teamId}/join-requests`, { method: 'POST' }),

  /** 내가 낸 신청의 처리 상태 (최신순) */
  myJoinRequests: () => request<JoinRequestResponse[]>('/api/teams/my-join-requests'),

  /** 내 팀으로 들어온 대기 중인 신청. 팀장만 조회 가능. */
  pendingJoinRequests: () => request<JoinRequestResponse[]>('/api/teams/me/join-requests'),

  approveJoinRequest: (requestId: number) =>
    request<void>(`/api/teams/join-requests/${requestId}/approve`, { method: 'POST' }),

  rejectJoinRequest: (requestId: number) =>
    request<void>(`/api/teams/join-requests/${requestId}/reject`, { method: 'POST' }),

  /**
   * 내가 낸 대기 중인 신청을 철회한다. 기록이 남지 않아 곧바로 다시 신청할 수 있다.
   * 내 신청이 아니거나 없으면 404, 이미 승인·거절됐으면 409.
   */
  cancelJoinRequest: (requestId: number) =>
    request<void>(`/api/teams/my-join-requests/${requestId}`, { method: 'DELETE' }),
}

// ---------- 인수인계 카드 ----------

/**
 * multipart 오디오 파트의 필드명.
 *
 * OpenAPI 명세에 POST /api/handover-cards 의 requestBody 가 통째로 빠져 있어서
 * (springdoc 이 MultipartFile 파라미터를 문서화하지 못한 것으로 보인다) 명세만으로는
 * 알 수 없었고, 실제 서버에 시도해서 "audio" 임을 확인했다. ("file" 은 400)
 *
 * 그래도 후보 목록은 남겨둔다. 백엔드가 파라미터명을 바꾸면 프론트가 알아서 찾아내고,
 * 성공한 이름을 기억해 다음 업로드부터는 곧바로 그 이름을 쓴다.
 */
const AUDIO_FIELD_NAME = 'audio'
const CONFIGURED_AUDIO_FIELD = import.meta.env.VITE_AUDIO_FIELD_NAME
const LEARNED_FIELD_KEY = 'hc.audioFieldName'

function audioFieldCandidates(): string[] {
  const learned = localStorage.getItem(LEARNED_FIELD_KEY)
  const ordered = [
    CONFIGURED_AUDIO_FIELD,
    learned,
    AUDIO_FIELD_NAME,
    'file',
    'audioFile',
    'voice',
    'multipartFile',
  ]
  return [...new Set(ordered.filter((name): name is string => Boolean(name)))]
}

/** 필드명이 틀렸을 때 서버가 낼 법한 응답인지. 이 경우에만 다음 후보로 넘어간다. */
function looksLikeWrongFieldName(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 415)
}

/** MediaRecorder 의 mimeType 에서 업로드용 파일 확장자를 뽑아낸다. */
export function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0].trim()
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  }
  return map[base] ?? 'webm'
}

export const cards = {
  /**
   * 음성 파일을 올려 카드를 만든다. 서버는 즉시 { id, status } 로 응답하고
   * STT → 번역 → 요약은 백그라운드에서 진행되므로, 이후 get() 으로 상태를 확인해야 한다.
   */
  /**
   * @param audio 녹음 결과 Blob 또는 사용자가 고른 File
   * @param filename 서버에 보낼 파일명. File 을 넘기면 원본 이름을 그대로 쓴다.
   */
  create: async (audio: Blob, params: CreateHandoverCardParams, filename?: string) => {
    // 확장자로 컨테이너를 판단하는 서버도 있으므로 원본 파일명이 있으면 보존한다.
    const resolvedName =
      filename ??
      (audio instanceof File && audio.name
        ? audio.name
        : `handover.${extensionForMimeType(audio.type || 'audio/webm')}`)

    const candidates = audioFieldCandidates()
    let lastError: unknown

    for (const fieldName of candidates) {
      // FormData 는 재사용할 수 없으므로 후보마다 새로 만든다.
      const formData = new FormData()
      formData.append(fieldName, audio, resolvedName)

      try {
        const created = await request<HandoverCardCreatedResponse>('/api/handover-cards', {
          method: 'POST',
          body: formData,
          query: { ...params },
        })
        localStorage.setItem(LEARNED_FIELD_KEY, fieldName)
        console.info(`[handover] 오디오 multipart 필드명은 "${fieldName}" 입니다.`)
        return created
      } catch (caught) {
        lastError = caught
        // 필드명 문제로 보이지 않으면(401, 413, 500 등) 더 시도해봐야 의미가 없다.
        if (!looksLikeWrongFieldName(caught)) throw caught
        console.warn(`[handover] 필드명 "${fieldName}" 거부됨, 다음 후보를 시도합니다.`)
      }
    }

    throw lastError
  },

  list: (page = 0, size = 20) =>
    request<PageResponse<HandoverCardResponse>>('/api/handover-cards', { query: { page, size } }),

  get: (id: number, signal?: AbortSignal) =>
    request<HandoverCardResponse>(`/api/handover-cards/${id}`, { signal }),

  remove: (id: number) => request<void>(`/api/handover-cards/${id}`, { method: 'DELETE' }),

  reprocess: (id: number) =>
    request<HandoverCardCreatedResponse>(`/api/handover-cards/${id}/reprocess`, { method: 'POST' }),

  /**
   * AI 결과(전사·번역·요약)를 사람이 직접 고친다. 고친 카드 전체가 응답으로 온다.
   *
   * reprocess 와 다르다 — reprocess 는 원본 오디오부터 다시 돌려서 같은 인식 오류가
   * 또 나오고, 이쪽은 텍스트를 그대로 덮어쓴다. 대신 번역·요약을 다시 만들지 않으므로
   * 셋을 함께 고쳐야 앞뒤가 맞는다.
   *
   * 작성자가 아니면 404(존재를 숨기려는 응답), 아직 COMPLETED 가 아니면 409.
   */
  updateResult: (id: number, payload: UpdateHandoverResultRequest) =>
    request<HandoverCardResponse>(`/api/handover-cards/${id}/result`, {
      method: 'PATCH',
      json: payload,
    }),
}
