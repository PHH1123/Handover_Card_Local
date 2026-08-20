// Handover Card API v1 의 응답/요청 타입.
// 출처: https://api.handover-card.o-r.kr/v3/api-docs (OpenAPI 3.1)

// ---------- 인증 ----------

export interface SignupRequest {
  email: string
  password: string // 8~100자
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string // "Bearer"
  expiresInSeconds: number
}

export interface RefreshRequest {
  refreshToken: string
}

export interface OAuth2LoginRequest {
  code: string
  redirectUri: string
}

export interface SocialProviderResponse {
  provider: string
  displayName: string
  authorizationUri: string
  clientId: string
  scopes: string[]
}

// ---------- 회원 / 팀 요청 ----------

export interface UpdateProfileRequest {
  name: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  /** 8~100자 */
  newPassword: string
}

export interface CreateTeamRequest {
  /** 최대 50자, 중복 불가 */
  name: string
}

export interface TransferLeadershipRequest {
  memberId: number
}

// ---------- 회원 ----------

export interface MemberResponse {
  id: number
  email: string
  name: string
  role: string // USER | ADMIN
  createdAt: string
}

export type MemberProfileResponse = MemberResponse

export interface MemberLookupResponse {
  name: string
  email: string
}

export interface MemberLookupResult {
  hasTeam: boolean
  teamName: string | null
  matches: MemberLookupResponse[]
}

// ---------- 팀 ----------

export interface TeamResponse {
  id: number
  name: string
  leaderName: string
  leaderEmail: string
  memberCount: number
  createdAt: string
}

export interface TeamMemberResponse {
  memberId: number
  name: string
  email: string
  leader: boolean
}

export interface TeamDetailResponse {
  id: number
  name: string
  leaderName: string
  leaderEmail: string
  leader: boolean
  members: TeamMemberResponse[]
  createdAt: string
}

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface JoinRequestResponse {
  id: number
  teamId: number
  teamName: string
  memberName: string
  memberEmail: string
  status: JoinRequestStatus
  requestedAt: string
}

// ---------- 인수인계 카드 ----------

/**
 * 카드 처리 파이프라인 상태.
 * RECEIVED → TRANSCRIBING → TRANSCRIBED → SUMMARIZING → COMPLETED (또는 FAILED)
 */
export type HandoverCardStatus =
  | 'RECEIVED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'SUMMARIZING'
  | 'COMPLETED'
  | 'FAILED'

/** 더 이상 상태가 바뀌지 않는 종료 상태인지 */
export function isTerminalStatus(status: HandoverCardStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED'
}

/** 요약 항목 하나. 원문 언어와 번역 언어 두 벌로 온다. */
export interface SummaryEntryDto {
  source: string
  target: string
}

export interface SummaryDto {
  keyPoints: SummaryEntryDto[]
  actionItems: SummaryEntryDto[]
  blockers: SummaryEntryDto[]
}

export interface HandoverCardResponse {
  id: number
  senderName: string
  receiverName: string
  /** 카드 생성 당시 작성자의 팀. 팀 없이 만들었으면 null */
  teamName: string | null
  sourceLanguage: string
  targetLanguage: string
  status: HandoverCardStatus
  transcript: string | null
  translatedText: string | null
  summary: SummaryDto | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

/** 카드 생성/재처리 직후 응답. 처리는 백그라운드에서 비동기로 진행된다. */
export interface HandoverCardCreatedResponse {
  id: number
  status: HandoverCardStatus
}

/**
 * AI 결과를 사람이 직접 고칠 때 보내는 값. 보내지 않은 항목은 서버가 그대로 둔다.
 *
 * 주의: 이 요청은 번역·요약을 다시 돌리지 않는다. 전사만 고치면 번역문과 요약은
 * 틀린 채로 남으므로, 화면은 세 가지를 함께 고치게 해야 한다.
 *
 * transcript/translatedText 는 공백만으로 채울 수 없다(서버 패턴 검증). 지우고 싶으면
 * 보내지 않는 수밖에 없고, 그러면 기존 값이 유지된다.
 */
export interface UpdateHandoverResultRequest {
  transcript?: string
  translatedText?: string
  /** 보내면 기존 요약을 통째로 대체한다. 원문·번역이 모두 빈 항목은 저장되지 않는다. */
  summary?: SummaryDto
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface CreateHandoverCardParams {
  senderName: string
  receiverName: string
  /** 선택. 가입된 회원 이메일과 일치하면 그 회원도 카드를 조회할 수 있다. */
  receiverEmail?: string
  /** ISO 639-1 두 글자 코드 (예: "en") */
  sourceLanguage: string
  /** ISO 639-1 두 글자 코드 (예: "ko") */
  targetLanguage: string
}
