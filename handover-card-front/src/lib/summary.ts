import type { HandoverCardResponse, SummaryEntryDto } from '../api/types'
import type { Lang } from '../i18n/messages'

/**
 * 요약 한 줄을 화면 언어에 맞춰 고른다.
 *
 * 서버가 항목마다 원문(`source`)과 번역문(`target`) 두 벌을 다 준다. 카드에는 그 두 벌이
 * 각각 어느 언어인지(`sourceLanguage`/`targetLanguage`) 적혀 있으므로, 지금 보고 있는
 * 화면 언어와 같은 쪽을 골라 주면 새로 번역하지 않고도 읽는 사람의 언어로 보인다.
 *
 * 카드가 그 언어를 아예 갖고 있지 않으면(예: 일본어→중국어 카드를 영어 화면에서 볼 때)
 * 번역문을 준다. 감추는 것보다 무엇이든 읽히는 편이 낫다.
 */
export function summaryTextFor(
  entry: SummaryEntryDto,
  card: Pick<HandoverCardResponse, 'sourceLanguage' | 'targetLanguage'>,
  lang: Lang,
): string {
  if (card.targetLanguage === lang) return entry.target || entry.source
  if (card.sourceLanguage === lang) return entry.source || entry.target
  return entry.target || entry.source
}
