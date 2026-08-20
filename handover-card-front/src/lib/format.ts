import { getActiveLang, messages } from '../i18n/messages'

/** Intl 에 넘길 로케일. 고른 언어를 따라간다. */
function locale(): string {
  return getActiveLang() === 'en' ? 'en-US' : 'ko-KR'
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale(), {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** 목록에서 "3분 전" 처럼 짧게 보여줄 때 쓴다. */
export function formatRelative(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absolute = Math.abs(diffSeconds)

  // Intl 은 0초 차이를 "지금" 으로 준다. 이미 끝난 일을 가리키는 자리라 "방금 전" 이 맞다.
  // 1분 안쪽은 초 단위를 보여줄 이유가 없어 함께 묶는다.
  if (absolute < 60) return messages().time.justNow

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60 * 60],
    ['hour', 60 * 60 * 24],
    ['day', 60 * 60 * 24 * 7],
  ]
  const formatter = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })

  let divisor = 1
  for (const [unit, limit] of units) {
    if (absolute < limit) return formatter.format(Math.round(diffSeconds / divisor), unit)
    divisor = limit
  }
  return formatDateTime(iso)
}
