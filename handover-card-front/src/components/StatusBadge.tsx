import type { HandoverCardStatus } from '../api/types'
import { useT } from '../i18n/LanguageContext'
import { messages } from '../i18n/messages'

function modifier(status: HandoverCardStatus): string {
  if (status === 'COMPLETED') return 'badge--done'
  if (status === 'FAILED') return 'badge--failed'
  return 'badge--pending'
}

/**
 * 훅을 쓸 수 없는 자리에서도 상태 이름이 필요해 모듈 통로로 읽는다.
 * 화면 안에서는 useStatusLabel 을 써야 언어를 바꿨을 때 다시 그려진다.
 */
export function statusLabel(status: HandoverCardStatus): string {
  return messages().status[status] ?? status
}

export function useStatusLabel(): (status: HandoverCardStatus) => string {
  const t = useT()
  return (status) => t.status[status] ?? status
}

export function StatusBadge({ status }: { status: HandoverCardStatus }) {
  const label = useStatusLabel()

  return (
    <span className={`badge ${modifier(status)}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label(status)}
    </span>
  )
}
