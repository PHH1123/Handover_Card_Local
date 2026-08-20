import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ApiError } from '../api/client'
import { cards } from '../api/endpoints'
import { isTerminalStatus, type HandoverCardResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { COMPOSE_ANCHOR, scrollToCompose } from '../components/AppLayout'
import { NewCardForm } from '../components/NewCardForm'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage, useT } from '../i18n/LanguageContext'
import { messages } from '../i18n/messages'
import { formatRelative } from '../lib/format'
import { languageLabel } from '../lib/languages'
import { summaryTextFor } from '../lib/summary'

const PAGE_SIZE = 20

/** 처리 중인 카드가 목록에 있으면 이 간격으로 첫 페이지를 다시 불러온다. */
const REFRESH_INTERVAL_MS = 4000

type Tab = 'all' | 'sent' | 'received' | 'team'
type Bucket = Exclude<Tab, 'all'>

const TAB_ORDER: Tab[] = ['all', 'sent', 'received', 'team']

/** 요약에 막힌 부분이 잡힌 카드. 목록에서 먼저 눈에 띄어야 한다. */
function hasIssue(card: HandoverCardResponse): boolean {
  return (card.summary?.blockers?.length ?? 0) > 0
}

/**
 * 카드를 세 갈래로 나눈다 — 내가 보낸 것, 나에게 온 것, 팀이라서 보이는 것.
 *
 * 목록에는 내 카드만 오는 게 아니다. 카드에는 만들 당시 작성자의 팀이 박히고
 * 그 팀원은 남의 인계도 함께 볼 수 있어서, 다른 팀원끼리 주고받은 카드가 섞여 온다.
 *
 * 응답에 소유자를 알려주는 값이 없어서(`owner` 플래그도, 이메일도 없다) 이름을
 * 맞춰 보는 수밖에 없다. 동명이인이면 어긋난다.
 * 백엔드에 `owner: boolean` 이 생기면 그 값으로 바꿔야 한다.
 */
function classify(card: HandoverCardResponse, myName: string): Bucket {
  if (myName.length === 0) return 'team'
  if (card.senderName.trim() === myName) return 'sent'
  if (card.receiverName.trim() === myName) return 'received'
  return 'team'
}

export function CardListPage() {
  const location = useLocation()
  const { user } = useAuth()
  const t = useT()
  const [tab, setTab] = useState<Tab>('all')
  const [items, setItems] = useState<HandoverCardResponse[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFirstPage = useCallback(async () => {
    try {
      const result = await cards.list(0, PAGE_SIZE)
      setItems(result.content)
      setPage(result.page)
      setHasNext(result.hasNext)
      setError(null)
    } catch (caught) {
      // 이 콜백은 언어에 묶이면 안 된다. 묶으면 언어를 바꿀 때마다 목록을 다시 불러온다.
      setError(caught instanceof ApiError ? caught.message : messages().cards.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  // 아직 처리 중인 카드가 있으면 목록을 주기적으로 갱신해 상태가 저절로 바뀌게 한다.
  const hasProcessing = items.some((card) => !isTerminalStatus(card.status))
  const loadRef = useRef(loadFirstPage)
  loadRef.current = loadFirstPage

  useEffect(() => {
    if (!hasProcessing) return
    const timer = window.setInterval(() => void loadRef.current(), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [hasProcessing])

  // 다른 화면에서 「새 인계 남기기」 를 눌러 넘어온 경우. 목록을 그린 뒤라야 자리가 잡힌다.
  const wantsCompose = Boolean((location.state as { scrollToCompose?: boolean } | null)?.scrollToCompose)

  useEffect(() => {
    if (!wantsCompose || loading) return
    scrollToCompose()
    // 뒤로 갔다 돌아왔을 때 또 내려가지 않도록 표시를 지운다.
    window.history.replaceState({}, '')
  }, [wantsCompose, loading])

  const myName = user?.name?.trim() ?? ''
  const buckets: Record<Bucket, HandoverCardResponse[]> = { sent: [], received: [], team: [] }
  for (const card of items) buckets[classify(card, myName)].push(card)

  const shown = tab === 'all' ? items : buckets[tab]

  function countOf(key: Tab): number {
    return key === 'all' ? items.length : buckets[key].length
  }

  const tabLabel: Record<Tab, string> = {
    all: t.cards.tabAll,
    sent: t.cards.tabSent,
    received: t.cards.tabReceived,
    team: t.cards.tabTeam,
  }
  const tabEmpty: Record<Tab, string> = {
    all: t.cards.emptyAll,
    sent: t.cards.emptySent,
    received: t.cards.emptyReceived,
    team: t.cards.emptyTeam,
  }

  // 팀에 속하지 않으면 팀 카드는 영영 비어 있다. 빈 탭을 띄워 둘 이유가 없다.
  const visibleTabs = TAB_ORDER.filter((key) => key !== 'team' || buckets.team.length > 0)

  // 팀 이름은 카드에 박혀 오므로 팀 카드 중 아무 장에서나 가져오면 된다.
  const teamName = buckets.team.find((card) => card.teamName)?.teamName ?? null

  async function loadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const result = await cards.list(page + 1, PAGE_SIZE)
      setItems((previous) => [...previous, ...result.content])
      setPage(result.page)
      setHasNext(result.hasNext)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.cards.loadMoreFailed)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="center-screen" style={{ minHeight: 320 }}>
        <span className="spinner" />
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{t.cards.title}</h1>
        <p className="page-subtitle">{t.cards.subtitle}</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <p>{t.cards.firstCard}</p>
          </div>
        </div>
      ) : (
        /* 파일철 색인지처럼 위쪽 탭으로 넘겨 본다. 스크롤로 찾지 않아도 된다. */
        <div className="folder">
          <div className="folder-tabs" role="tablist" aria-label={t.cards.title}>
            {visibleTabs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className="folder-tab"
                onClick={() => setTab(key)}
              >
                {tabLabel[key]}
                <span className="folder-count">{countOf(key)}</span>
              </button>
            ))}
          </div>

          <div className="folder-body" role="tabpanel">
            {/* 왜 남의 인계가 내 목록에 있는지 여기서 한 번 설명해 준다 */}
            {tab === 'team' && (
              <p className="folder-note">{t.cards.teamNote(teamName ?? t.cards.sameTeam)}</p>
            )}

            {shown.length === 0 ? (
              <div className="empty-state">
                <p>{tabEmpty[tab]}</p>
              </div>
            ) : (
              <div className="card-list">
                {shown.map((card) => (
                  <Link key={card.id} to={`/cards/${card.id}`} className="card-item">
                    <div className="spread">
                      <span className="card-item-title">
                        {card.senderName} → {card.receiverName}
                        {hasIssue(card) && (
                          <span
                            className="issue-dot"
                            role="img"
                            aria-label={t.cards.issue}
                            title={t.cards.issueTitle}
                          />
                        )}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <CardPreview card={card} />

                    <div className="card-item-meta">
                      <span>
                        {languageLabel(card.sourceLanguage)} → {languageLabel(card.targetLanguage)}
                      </span>
                      {card.teamName && <span>· {card.teamName}</span>}
                      <span>· {formatRelative(card.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 걸러 보는 중에도 남은 페이지는 불러올 수 있어야 한다 */}
            {hasNext && (
              <button
                type="button"
                className="btn btn--block"
                style={{ marginTop: 16 }}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && <span className="spinner" />}
                {t.common.loadMore}
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        남긴 카드 아래에서 바로 다음 인계를 남긴다. 페이지를 옮기지 않아도 되고,
        데모에서 "쌓인 카드"와 "남기는 방법"이 한 화면에 함께 보인다.
      */}
      <section className="compose" id={COMPOSE_ANCHOR}>
        <div className="compose-head">
          <h2 className="page-title">{t.cards.composeTitle}</h2>
          <p className="page-subtitle">{t.cards.composeSubtitle}</p>
        </div>
        <NewCardForm />
      </section>
    </>
  )
}

/**
 * 목록에 보여줄 한 줄. 요약의 핵심 내용 첫 줄만 쓴다.
 *
 * 예전에는 요약이 없으면 번역문·원문 전체로 대신했는데, 그러면 목록에 말한 그대로가
 * 길게 깔려서 "정리된 인계" 라는 인상이 사라진다. 요약이 없으면 그 사실을 적는 편이 낫다.
 */
function CardPreview({ card }: { card: HandoverCardResponse }) {
  const { lang, t } = useLanguage()
  const firstKeyPoint = card.summary?.keyPoints?.[0]

  if (firstKeyPoint) {
    // 화면 언어와 같은 쪽을 골라 보여준다. 카드가 두 언어를 다 갖고 있어 새로 번역할 필요가 없다.
    return <p className="card-item-preview">{summaryTextFor(firstKeyPoint, card, lang)}</p>
  }

  // 아직 처리 중이면 상태 배지가 이미 그 사실을 말하고 있으므로 덧붙이지 않는다.
  if (!isTerminalStatus(card.status)) return null

  return <p className="card-item-preview card-item-preview--empty">{t.cards.noSummary}</p>
}
