import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { cards } from '../api/endpoints'
import { isTerminalStatus, type HandoverCardResponse } from '../api/types'

/** 처리 중인 카드를 다시 조회하는 간격 */
const POLL_INTERVAL_MS = 2000

/**
 * COMPLETED 인데 요약이 비어 있을 때 더 확인해 볼 횟수.
 *
 * 서버가 요약을 저장하기 전에 상태를 먼저 COMPLETED 로 바꾸면, 그 순간을 본 화면은
 * 폴링을 멈추고 빈 요약으로 굳는다. 새로고침해야 보이는 상황이 되므로 몇 번 더 확인한다.
 * 정말로 뽑을 내용이 없어서 빈 경우에도 요청 몇 번으로 끝난다.
 */
const EMPTY_SUMMARY_RETRIES = 3

function summaryIsEmpty(card: HandoverCardResponse): boolean {
  const summary = card.summary
  if (!summary) return true
  return (
    (summary.keyPoints?.length ?? 0) +
      (summary.actionItems?.length ?? 0) +
      (summary.blockers?.length ?? 0) ===
    0
  )
}

/**
 * 카드를 불러오고, 아직 처리 중이면 COMPLETED/FAILED 가 될 때까지 주기적으로 다시 조회한다.
 * 서버가 202 로 즉시 응답하고 STT → 번역 → 요약을 백그라운드에서 돌리는 구조라 폴링이 필요하다.
 */
export function useHandoverCard(id: number | null) {
  const [card, setCard] = useState<HandoverCardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 폴링 중에도 최신 상태를 봐야 해서 ref 로 따로 들고 있는다.
  const pollingRef = useRef(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (id === null) return
      try {
        const fetched = await cards.get(id, signal)
        setCard(fetched)
        setError(null)
        return fetched
      } catch (caught) {
        if (signal?.aborted) return
        setError(caught instanceof ApiError ? caught.message : '카드를 불러오지 못했습니다.')
        return
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    if (id === null) return

    const controller = new AbortController()
    let timer: number | null = null
    let emptySummaryChecks = 0
    pollingRef.current = true

    async function tick() {
      const fetched = await load(controller.signal)
      if (!pollingRef.current || controller.signal.aborted) return

      // 조회 자체가 실패하면 더 두드려도 소용없다.
      if (!fetched) return

      if (!isTerminalStatus(fetched.status)) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS)
        return
      }

      // 끝났다고 하는데 요약이 비었으면, 아직 저장 중일 수 있으니 몇 번 더 확인한다.
      if (
        fetched.status === 'COMPLETED' &&
        summaryIsEmpty(fetched) &&
        emptySummaryChecks < EMPTY_SUMMARY_RETRIES
      ) {
        emptySummaryChecks += 1
        timer = window.setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    setLoading(true)
    void tick()

    return () => {
      pollingRef.current = false
      controller.abort()
      if (timer !== null) clearTimeout(timer)
    }
  }, [id, load])

  const refresh = useCallback(() => load(), [load])

  return { card, loading, error, refresh, setCard }
}
