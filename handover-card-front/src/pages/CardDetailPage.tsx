import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { cards } from '../api/endpoints'
import type {
  HandoverCardResponse,
  HandoverCardStatus,
  SummaryDto,
  SummaryEntryDto,
  UpdateHandoverResultRequest,
} from '../api/types'
import { StatusBadge, useStatusLabel } from '../components/StatusBadge'
import { useHandoverCard } from '../hooks/useHandoverCard'
import { useLanguage } from '../i18n/LanguageContext'
import { type Messages } from '../i18n/messages'
import { formatDateTime } from '../lib/format'
import { languageLabel } from '../lib/languages'
import { summaryTextFor } from '../lib/summary'

/**
 * 진행 표시줄에 쓰는 파이프라인 순서와 칸 이름.
 * 상태 이름을 그대로 쓰면 TRANSCRIBED 처럼 "무엇이 끝났다" 는 값이 섞여 읽기 어렵다.
 * 사용자가 기다리는 단위(인식 → 번역 → 요약)로 이름을 붙인다.
 */
const PIPELINE: { status: HandoverCardStatus; label: (t: Messages) => string }[] = [
  { status: 'RECEIVED', label: (t) => t.detail.stepReceived },
  { status: 'TRANSCRIBING', label: (t) => t.detail.stepTranscribing },
  { status: 'TRANSCRIBED', label: (t) => t.detail.stepTranslating },
  { status: 'SUMMARIZING', label: (t) => t.detail.stepSummarizing },
  { status: 'COMPLETED', label: (t) => t.detail.stepDone },
]

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null
  const { card, loading, error, refresh, setCard } = useHandoverCard(numericId)
  const { t } = useLanguage()
  const statusLabel = useStatusLabel()

  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (loading && !card) {
    return (
      <div className="center-screen" style={{ minHeight: 320 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (error && !card) {
    return (
      <div className="panel">
        <div className="alert alert--error" role="alert">
          {error}
        </div>
        <Link to="/" className="btn" style={{ marginTop: 16 }}>
          {t.common.backToList}
        </Link>
      </div>
    )
  }

  if (!card) return null

  async function handleReprocess() {
    if (!card) return
    setBusy(true)
    setActionError(null)
    try {
      await cards.reprocess(card.id)
      await refresh()
    } catch (caught) {
      // 재처리도 소유자만 가능하며, 권한이 없으면 404 로 온다.
      setActionError(
        caught instanceof ApiError && caught.status === 404
          ? t.detail.reprocessDenied
          : caught instanceof ApiError
            ? caught.message
            : t.detail.reprocessFailed,
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!card) return
    if (!window.confirm(t.detail.confirmDelete)) return
    setBusy(true)
    setActionError(null)
    try {
      await cards.remove(card.id)
      navigate('/', { replace: true })
    } catch (caught) {
      // 소유자가 아니면 서버가 카드 존재 여부를 숨기려고 403 대신 404 를 준다.
      // "찾을 수 없음" 이라고 그대로 보여주면 사용자가 오해하므로 상황을 설명한다.
      setActionError(
        caught instanceof ApiError && caught.status === 404
          ? t.detail.deleteDenied
          : caught instanceof ApiError
            ? caught.message
            : t.detail.deleteFailed,
      )
      setBusy(false)
    }
  }

  const isProcessing = card.status !== 'COMPLETED' && card.status !== 'FAILED'
  const currentStep = PIPELINE.findIndex((step) => step.status === card.status)

  return (
    <>
      <div className="page-head">
        <Link to="/" className="btn btn--ghost" style={{ marginBottom: 12, paddingLeft: 0 }}>
          {t.common.backToList}
        </Link>

        <div className="detail-head">
          <div>
            <p className="detail-eyebrow">
              {card.teamName ? `${card.teamName} · ` : ''}
              {formatDateTime(card.createdAt)}
            </p>
            <h1 className="page-title" style={{ marginTop: 5 }}>
              {card.senderName} → {card.receiverName}
            </h1>
            <p className="page-subtitle" style={{ marginTop: 3 }}>
              {languageLabel(card.sourceLanguage)} → {languageLabel(card.targetLanguage)}
            </p>
          </div>
          <StatusBadge status={card.status} />
        </div>
      </div>

      {actionError && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}
      {notice && (
        <div className="alert alert--info" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      )}

      {isProcessing && (
        <div className="panel">
          <div className="spread">
            <strong>{statusLabel(card.status)}</strong>
            {/* 몇 단계 중 몇 번째인지. 숫자만 들어가는 자리라 모노스페이스가 맞다. */}
            <span className="progress-count">
              {currentStep + 1} / {PIPELINE.length}
            </span>
          </div>
          <p className="faint" style={{ marginTop: 4 }}>
            {t.detail.processingNote}
          </p>

          {/* 돌아가는 로딩 대신 진행 칸이 상태를 알린다 */}
          <div className="progress-track">
            {PIPELINE.map((step, index) => (
              <span
                key={step.status}
                className="progress-step"
                data-state={index < currentStep ? 'done' : index === currentStep ? 'active' : 'todo'}
              />
            ))}
          </div>
          <div className="progress-labels">
            {PIPELINE.map((step, index) => (
              <span key={step.status} className="progress-label" data-current={index === currentStep}>
                {step.label(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {card.status === 'FAILED' && (
        <div className="panel">
          <strong style={{ color: 'var(--danger)' }}>{t.detail.failedTitle}</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {card.errorMessage ?? t.detail.noReason}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 16 }}
            onClick={handleReprocess}
            disabled={busy}
          >
            {busy && <span className="spinner" />}
            {t.detail.reprocess}
          </button>
        </div>
      )}

      {editing ? (
        <ResultEditor
          card={card}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setCard(updated)
            setEditing(false)
            setActionError(null)
            setNotice(t.detail.editSaved)
          }}
        />
      ) : (
        <>
          {/*
            요약이 비어 있어도 블록은 남긴다. 통째로 사라지면 "요약이 없다" 와
            "요약 자리가 아예 없다" 가 구분되지 않는다.
          */}
          {(card.status === 'COMPLETED' || (card.summary && hasAnySummary(card.summary))) && (
            <div className="panel">
              <h2 className="summary-title">{t.detail.summary}</h2>

              {/*
                요약이 통째로 없는 것과 항목만 비어 있는 것은 원인이 다르다.
                앞은 서버가 요약을 못 만든 것이고, 뒤는 말한 내용에 그 항목이 없던 것이다.
                둘 다 「없음」 으로 보이면 어느 쪽인지 알 수 없다.
              */}
              {card.summary ? (
                <>
                  <SummarySection card={card} title={t.detail.keyPoints} entries={card.summary.keyPoints ?? []} />
                  <SummarySection card={card} title={t.detail.actionItems} entries={card.summary.actionItems ?? []} />
                  <SummarySection
                    card={card}
                    title={t.detail.issues}
                    entries={card.summary.blockers ?? []}
                    variant="blocker"
                  />
                </>
              ) : (
                <div className="alert alert--info" style={{ marginTop: 20 }}>
                  <strong>{t.detail.noSummaryTitle}</strong>
                  <p style={{ marginTop: 6, fontSize: 13 }}>{t.detail.noSummaryBody}</p>
                </div>
              )}
            </div>
          )}

          {(card.translatedText || card.transcript) && (
            <div className="panel">
              <h2 className="section-title" style={{ marginBottom: 12 }}>
                {t.detail.fullText}
              </h2>

              {card.translatedText && (
                <div className="transcript-block">
                  <p className="transcript-label">
                    {t.detail.translated(languageLabel(card.targetLanguage))}
                  </p>
                  <p className="transcript">{card.translatedText}</p>
                </div>
              )}

              {card.transcript && (
                <div className="transcript-block">
                  <p className="transcript-label">
                    {t.detail.original(languageLabel(card.sourceLanguage))}
                  </p>
                  <p className="transcript transcript--source">{card.transcript}</p>
                </div>
              )}
            </div>
          )}

          <div className="btn-row" style={{ marginTop: 24 }}>
            {/*
              고칠 수 있는 사람은 작성자뿐이지만 응답에 소유자를 알려주는 값이 없어
              화면에서는 구분할 수 없다. 버튼은 모두에게 보이고, 눌러서 404 가 오면
              그때 「만든 사람만 고칠 수 있다」 고 알린다 — 삭제·재처리와 같은 방식이다.
            */}
            {card.status === 'COMPLETED' && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => {
                  setEditing(true)
                  setNotice(null)
                  setActionError(null)
                }}
              >
                {t.detail.edit}
              </button>
            )}
            <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={busy}>
              {t.detail.deleteCard}
            </button>
          </div>
        </>
      )}
    </>
  )
}

function hasAnySummary(summary: { keyPoints: unknown[]; actionItems: unknown[]; blockers: unknown[] }) {
  return summary.keyPoints.length > 0 || summary.actionItems.length > 0 || summary.blockers.length > 0
}

// ---------- 결과 고치기 ----------

/**
 * 편집 중인 요약 항목. 항목을 추가·삭제하므로 배열 인덱스를 key 로 쓸 수 없다.
 * 인덱스를 쓰면 가운데를 지웠을 때 아래 항목들이 남의 입력값을 물려받는다.
 */
interface DraftEntry {
  key: number
  source: string
  target: string
}

let draftKeySeed = 0
function nextDraftKey() {
  draftKeySeed += 1
  return draftKeySeed
}

function toDrafts(entries: SummaryEntryDto[] | undefined): DraftEntry[] {
  return (entries ?? []).map((entry) => ({
    key: nextDraftKey(),
    source: entry.source ?? '',
    target: entry.target ?? '',
  }))
}

/** 두 칸이 모두 빈 항목은 서버가 저장하지 않는다. 보내기 전에 화면에서도 같게 맞춘다. */
function fromDrafts(drafts: DraftEntry[]): SummaryEntryDto[] {
  return drafts
    .map((draft) => ({ source: draft.source.trim(), target: draft.target.trim() }))
    .filter((entry) => entry.source !== '' || entry.target !== '')
}

function sameEntries(a: SummaryEntryDto[], b: SummaryEntryDto[]): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => entry.source === b[index].source && entry.target === b[index].target)
  )
}

/**
 * AI 결과를 사람이 직접 고치는 화면.
 *
 * 서버는 보낸 항목만 덮어쓰고 **번역·요약을 다시 만들지 않는다.** 그래서 전사만 고치면
 * 번역문과 요약에는 잘못 들린 말이 그대로 남는다. 세 가지를 한 화면에서 함께 고치게 둔 이유다.
 */
function ResultEditor({
  card,
  onCancel,
  onSaved,
}: {
  card: HandoverCardResponse
  onCancel: () => void
  onSaved: (updated: HandoverCardResponse) => void
}) {
  const { t } = useLanguage()
  const [transcript, setTranscript] = useState(card.transcript ?? '')
  const [translatedText, setTranslatedText] = useState(card.translatedText ?? '')
  const [keyPoints, setKeyPoints] = useState(() => toDrafts(card.summary?.keyPoints))
  const [actionItems, setActionItems] = useState(() => toDrafts(card.summary?.actionItems))
  const [blockers, setBlockers] = useState(() => toDrafts(card.summary?.blockers))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sourceLabel = t.detail.original(languageLabel(card.sourceLanguage))
  const targetLabel = t.detail.translated(languageLabel(card.targetLanguage))

  /** 바뀐 항목만 담는다. 안 바뀐 것까지 보내면 서버가 굳이 덮어쓴다. */
  function buildPayload(): UpdateHandoverResultRequest | null {
    const payload: UpdateHandoverResultRequest = {}

    // 서버가 공백뿐인 값을 거부한다(패턴 검증). 비웠으면 보내지 않아 원래 값이 남는다.
    const nextTranscript = transcript.trim()
    if (nextTranscript !== '' && nextTranscript !== (card.transcript ?? '')) {
      payload.transcript = nextTranscript
    }

    const nextTranslated = translatedText.trim()
    if (nextTranslated !== '' && nextTranslated !== (card.translatedText ?? '')) {
      payload.translatedText = nextTranslated
    }

    const nextSummary: SummaryDto = {
      keyPoints: fromDrafts(keyPoints),
      actionItems: fromDrafts(actionItems),
      blockers: fromDrafts(blockers),
    }
    const before = card.summary
    const summaryChanged = before
      ? !sameEntries(nextSummary.keyPoints, before.keyPoints ?? []) ||
        !sameEntries(nextSummary.actionItems, before.actionItems ?? []) ||
        !sameEntries(nextSummary.blockers, before.blockers ?? [])
      : nextSummary.keyPoints.length + nextSummary.actionItems.length + nextSummary.blockers.length >
        0
    if (summaryChanged) payload.summary = nextSummary

    return Object.keys(payload).length > 0 ? payload : null
  }

  async function handleSave() {
    const payload = buildPayload()
    if (!payload) {
      setError(t.detail.editNoChanges)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await cards.updateResult(card.id, payload)
      // 응답이 고쳐진 카드 전체라 다시 조회할 필요가 없다.
      onSaved(updated)
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 404
          ? t.detail.editDenied
          : caught instanceof ApiError && caught.status === 409
            ? t.detail.editNotReady
            : caught instanceof ApiError
              ? caught.message
              : t.detail.editFailed,
      )
      // 성공하면 이 컴포넌트가 사라지므로 실패했을 때만 되돌린다.
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="section-title">{t.detail.edit}</h2>
      <p className="panel-note">{t.detail.editNote}</p>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <SummaryGroupEditor
        title={t.detail.keyPoints}
        drafts={keyPoints}
        onChange={setKeyPoints}
        sourceLabel={sourceLabel}
        targetLabel={targetLabel}
        disabled={saving}
      />
      <SummaryGroupEditor
        title={t.detail.actionItems}
        drafts={actionItems}
        onChange={setActionItems}
        sourceLabel={sourceLabel}
        targetLabel={targetLabel}
        disabled={saving}
      />
      <SummaryGroupEditor
        title={t.detail.issues}
        drafts={blockers}
        onChange={setBlockers}
        sourceLabel={sourceLabel}
        targetLabel={targetLabel}
        disabled={saving}
      />

      <p className="faint" style={{ marginTop: 4 }}>
        {t.detail.editEntryHint}
      </p>

      <section className="summary-group">
        <div className="summary-group-head">
          <h3 className="summary-heading">{t.detail.fullText}</h3>
        </div>

        <label className="edit-field">
          <span className="field-label">{targetLabel}</span>
          <textarea
            className="input input--area"
            rows={6}
            value={translatedText}
            disabled={saving}
            onChange={(event) => setTranslatedText(event.target.value)}
          />
        </label>

        <label className="edit-field">
          <span className="field-label">{sourceLabel}</span>
          <textarea
            className="input input--area"
            rows={6}
            value={transcript}
            disabled={saving}
            onChange={(event) => setTranscript(event.target.value)}
          />
        </label>

        <p className="faint" style={{ marginTop: 4 }}>
          {t.detail.editTextHint}
        </p>
      </section>

      <div className="btn-row" style={{ marginTop: 22 }}>
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving && <span className="spinner" />}
          {t.detail.editSave}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          {t.detail.editCancel}
        </button>
      </div>
    </div>
  )
}

/** 요약 한 묶음을 고치는 자리. 항목마다 원문·번역문 두 칸을 나란히 둔다. */
function SummaryGroupEditor({
  title,
  drafts,
  onChange,
  sourceLabel,
  targetLabel,
  disabled,
}: {
  title: string
  drafts: DraftEntry[]
  onChange: (next: DraftEntry[]) => void
  sourceLabel: string
  targetLabel: string
  disabled: boolean
}) {
  const { t } = useLanguage()

  function update(key: number, patch: Partial<DraftEntry>) {
    onChange(drafts.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
  }

  return (
    <section className="summary-group">
      <div className="summary-group-head">
        <h3 className="summary-heading">{title}</h3>
        {drafts.length > 0 && <span className="summary-count">{drafts.length}</span>}
      </div>

      {drafts.map((draft) => (
        <div key={draft.key} className="edit-entry">
          <label className="edit-field">
            <span className="field-label">{sourceLabel}</span>
            <textarea
              className="input input--area input--area-sm"
              rows={2}
              value={draft.source}
              disabled={disabled}
              onChange={(event) => update(draft.key, { source: event.target.value })}
            />
          </label>

          <label className="edit-field">
            <span className="field-label">{targetLabel}</span>
            <textarea
              className="input input--area input--area-sm"
              rows={2}
              value={draft.target}
              disabled={disabled}
              onChange={(event) => update(draft.key, { target: event.target.value })}
            />
          </label>

          <button
            type="button"
            className="btn btn--ghost edit-entry-remove"
            disabled={disabled}
            onClick={() => onChange(drafts.filter((entry) => entry.key !== draft.key))}
          >
            {t.detail.editRemoveEntry}
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn"
        disabled={disabled}
        style={{ marginTop: 10 }}
        onClick={() => onChange([...drafts, { key: nextDraftKey(), source: '', target: '' }])}
      >
        {t.detail.editAddEntry}
      </button>
    </section>
  )
}


/**
 * 요약 한 묶음을 점 목록으로 늘어놓는다.
 * 번역문을 크게, 원문을 그 아래 작게 — 둘을 함께 보여주는 것이 이 제품의 핵심이라
 * 언어를 토글로 감추지 않는다.
 *
 * 항목이 없으면 「없음」 한 줄을 남긴다. 묶음을 통째로 지우면 요약에서 이 항목이
 * 안 나온 것인지 화면이 그 자리를 안 만든 것인지 알 수 없다.
 */
function SummarySection({
  card,
  title,
  entries,
  variant,
}: {
  card: HandoverCardResponse
  title: string
  entries: SummaryEntryDto[]
  variant?: 'blocker'
}) {
  const { lang, t } = useLanguage()

  return (
    <section className="summary-group">
      <div className="summary-group-head">
        <h3 className="summary-heading">{title}</h3>
        {entries.length > 0 && <span className="summary-count">{entries.length}</span>}
      </div>

      <ul className="summary-list">
        {entries.length === 0 ? (
          <li className="summary-item summary-item--empty">{t.common.none}</li>
        ) : (
          entries.map((entry, index) => {
            // 읽는 사람의 언어를 크게, 나머지 한 벌을 그 아래 작게.
            const primary = summaryTextFor(entry, card, lang)
            const other = primary === entry.target ? entry.source : entry.target

            return (
              <li
                key={index}
                className={`summary-item${variant === 'blocker' ? ' summary-item--blocker' : ''}`}
              >
                <p className="summary-target">{primary}</p>
                {/* 두 벌이 같으면 덧붙일 이유가 없다 */}
                {other && other !== primary && <p className="summary-source">{other}</p>}
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}

