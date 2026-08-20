import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { cards, members, teams } from '../api/endpoints'
import type { TeamMemberResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AudioFilePicker } from './AudioFilePicker'
import { Recorder } from './Recorder'
import { Select } from './Select'
import { useT } from '../i18n/LanguageContext'
import { messages } from '../i18n/messages'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { LANGUAGES } from '../lib/languages'

/** 언어 목록은 어느 칸에서나 같으므로 한 번만 만들어 둔다. 이름은 그 언어로 적으므로 번역하지 않는다. */
const LANGUAGE_OPTIONS = LANGUAGES.map((language) => ({
  value: language.code,
  label: language.label,
}))

/** 음성을 어디서 가져올지 */
type Source = 'record' | 'upload'

/**
 * 새 인계를 남기는 폼. 카드 목록 아래에도 놓이고 `/cards/new` 화면에도 그대로 쓰인다.
 * 목록 아래에 놓일 때는 돌아갈 곳이 없으므로 취소 버튼을 빼려고 onCancel 을 선택으로 받는다.
 */
export function NewCardForm({ onCancel }: { onCancel?: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const recorder = useAudioRecorder()
  const t = useT()

  const [source, setSource] = useState<Source>('record')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  /**
   * 보내는 사람은 계정 이름으로 고정한다.
   *
   * 고칠 수 있게 두면 남의 이름으로 인계를 남긴 것처럼 보이게 만들 수 있고,
   * 무엇보다 목록에서 보낸 카드와 받은 카드를 이 이름으로 갈라내고 있어서
   * 다른 이름으로 적은 카드가 「받은 카드」 쪽으로 넘어가 버린다.
   * 표시될 이름을 바꾸려면 설정에서 계정 이름을 바꾸면 된다.
   */
  const senderName = user?.name?.trim() ?? ''

  const [receiverName, setReceiverName] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('ko')
  const [targetLanguage, setTargetLanguage] = useState('en')

  const [lookupHint, setLookupHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /** 내 팀 팀원 목록(나 제외). 이름 조회 대신 여기서 골라 이메일을 정확히 채운다. */
  const [teammates, setTeammates] = useState<TeamMemberResponse[]>([])
  const [teamName, setTeamName] = useState<string | null>(null)
  /** 팀원 중에서 고르는 중이면 선택된 memberId, 직접 입력 중이면 'manual' */
  const [pick, setPick] = useState<string>('manual')

  // 팀이 있으면 팀원 목록을 받아 수신자 선택에 쓴다.
  // 이름 완전 일치에 의존하는 /api/members/lookup 과 달리 이메일이 확실하게 맞는다.
  useEffect(() => {
    let cancelled = false

    teams
      .myTeam()
      .then((team) => {
        if (cancelled) return
        const others = team.members.filter((member) => member.email !== user?.email)
        setTeammates(others)
        setTeamName(team.name)
        // 고를 팀원이 있으면 그쪽을 기본값으로 둔다.
        if (others.length > 0) setPick(String(others[0].memberId))
      })
      .catch((caught) => {
        if (cancelled) return
        // 팀이 없으면 404 가 정상 응답이다. 직접 입력 모드로 두면 된다.
        if (caught instanceof ApiError && caught.status === 404) return
        setLookupHint(
          caught instanceof ApiError
            ? messages().compose.teamLoadFailed(caught.message)
            : messages().compose.teamLoadFailedPlain,
        )
      })

    return () => {
      cancelled = true
    }
  }, [user?.email])

  // 선택한 팀원을 수신자 정보에 반영한다.
  useEffect(() => {
    if (pick === 'manual') return
    const member = teammates.find((candidate) => String(candidate.memberId) === pick)
    if (!member) return
    setReceiverName(member.name)
    setReceiverEmail(member.email)
    setLookupHint(null)
  }, [pick, teammates])

  // 직접 입력할 때만 이름으로 이메일을 찾아본다. 완전 일치라 실패할 수 있으므로 결과를 반드시 알려준다.
  useEffect(() => {
    if (pick !== 'manual') return

    const name = receiverName.trim()
    if (name.length < 2) {
      setLookupHint(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const result = await members.lookup(name)
        if (cancelled) return

        if (!result.hasTeam) {
          setLookupHint(messages().compose.lookupNoTeam)
          return
        }
        const match = (result.matches ?? [])[0]
        if (match) {
          setReceiverEmail(match.email)
          setLookupHint(messages().compose.lookupFound(result.teamName ?? '', match.email))
        } else {
          setLookupHint(messages().compose.lookupMissing(name))
        }
      } catch (caught) {
        // 조용히 넘기면 "아무 일도 안 일어남" 으로 보여 원인을 알 수 없다. 반드시 표시한다.
        if (!cancelled) {
          setLookupHint(
            caught instanceof ApiError
              ? messages().compose.lookupFailed(caught.message, caught.status)
              : messages().compose.lookupFailedPlain,
          )
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [receiverName, pick])

  // 녹음 결과와 업로드 파일 중 현재 선택된 쪽
  const audio: Blob | null = source === 'record' ? recorder.blob : uploadedFile

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    if (!audio) {
      setError(source === 'record' ? t.compose.errorNoRecording : t.compose.errorNoFile)
      return
    }
    if (sourceLanguage === targetLanguage) {
      setError(t.compose.errorSameLanguage)
      return
    }
    // 서버가 보내는 사람 이름을 반드시 요구한다. 계정에 이름이 없으면 여기서 막힌다.
    if (!senderName) {
      setError(t.compose.errorNoSenderName)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = await cards.create(audio, {
        senderName,
        receiverName: receiverName.trim(),
        receiverEmail: receiverEmail.trim() || undefined,
        sourceLanguage,
        targetLanguage,
      })
      // 처리는 서버에서 비동기로 이어지므로 상세 화면으로 보내 진행 상황을 보여준다.
      navigate(`/cards/${created.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.compose.errorCreate)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="panel">
        <div className="segmented" role="tablist" aria-label={t.compose.sourceTabs}>
          <button
            type="button"
            role="tab"
            aria-selected={source === 'record'}
            onClick={() => setSource('record')}
          >
            {t.compose.record}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={source === 'upload'}
            onClick={() => {
              // 녹음 중에 탭을 옮기면 마이크가 계속 켜져 있으므로 정리한다.
              // (녹음된 결과는 남겨둬서 다시 돌아오면 그대로 쓸 수 있다.)
              if (recorder.state === 'recording' || recorder.state === 'paused') recorder.stop()
              setSource('upload')
            }}
          >
            {t.compose.upload}
          </button>
        </div>

        {source === 'record' ? (
          <Recorder recorder={recorder} />
        ) : (
          <AudioFilePicker file={uploadedFile} onSelect={setUploadedFile} />
        )}

        {/* 음성과 받는 사람은 한 장 안에 있되, 성격이 다르므로 선으로만 나눈다 */}
        <div className="panel-split" />

        <div className="field-row">
          <div className="field">
            <div className="field-label-row">
              <span className="field-label">{t.compose.sender}</span>
              <span className="field-hint">
                {t.compose.senderHintPrefix}
                <Link to="/settings" className="link">
                  {t.compose.settings}
                </Link>
                {t.compose.senderHintSuffix}
              </span>
            </div>
            <p className="input input--static">
              {senderName || <span className="faint">{t.compose.noAccountName}</span>}
            </p>
          </div>

          <div className="field">
            {/* 힌트를 라벨 옆에 둔다. 아래에 붙이면 이 칸만 높아져 좌우 정렬이 어긋난다. */}
            <div className="field-label-row">
              <label className="field-label" htmlFor="receiverPick">
                {t.compose.receiver}
              </label>
              {teammates.length > 0 && teamName && (
                <span className="field-hint">{t.compose.receiverTeamHint(teamName)}</span>
              )}
            </div>
            {teammates.length > 0 ? (
              <Select
                id="receiverPick"
                value={pick}
                onChange={(next) => {
                  setPick(next)
                  // 직접 입력으로 바꾸면 앞서 고른 팀원 값이 남아 헷갈리므로 비워서 시작한다.
                  if (next === 'manual') {
                    setReceiverName('')
                    setReceiverEmail('')
                    setLookupHint(null)
                  }
                }}
                options={[
                  ...teammates.map((member) => ({
                    value: String(member.memberId),
                    label: member.name,
                    badge: member.leader ? t.common.leaderTag : undefined,
                    hint: member.email,
                  })),
                  { value: 'manual', label: t.compose.manualEntry, divider: true },
                ]}
              />
            ) : (
              <input
                id="receiverPick"
                className="input"
                value={receiverName}
                onChange={(event) => setReceiverName(event.target.value)}
                placeholder={t.compose.namePlaceholder}
                required
              />
            )}
          </div>
        </div>

        {/* 팀원을 골랐으면 이름·이메일이 정확히 채워지므로 입력란을 보여줄 필요가 없다. */}
        {(pick === 'manual' || teammates.length === 0) && (
          <>
            {teammates.length > 0 && (
              <div className="field">
                <label className="field-label" htmlFor="receiverName">
                  {t.compose.receiverName}
                </label>
                <input
                  id="receiverName"
                  className="input"
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder={t.compose.namePlaceholder}
                  required
                />
              </div>
            )}

            <div className="field">
              {/* 설명은 라벨 옆으로 뺀다. 입력칸 안내문 자리에는 형식 예시가 들어가야 한다. */}
              <div className="field-label-row">
                <label className="field-label" htmlFor="receiverEmail">
                  {t.compose.receiverEmail} <span className="faint">{t.compose.optional}</span>
                </label>
                <span className="field-hint">{t.compose.emailNote}</span>
              </div>
              <input
                id="receiverEmail"
                className="input"
                type="email"
                value={receiverEmail}
                onChange={(event) => setReceiverEmail(event.target.value)}
                placeholder={t.compose.emailPlaceholder}
              />
              {lookupHint && <span className="field-hint">{lookupHint}</span>}
            </div>
          </>
        )}

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="sourceLanguage">
              {t.compose.sourceLanguage}
            </label>
            <Select
              id="sourceLanguage"
              value={sourceLanguage}
              onChange={setSourceLanguage}
              options={LANGUAGE_OPTIONS}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="targetLanguage">
              {t.compose.targetLanguage}
            </label>
            <Select
              id="targetLanguage"
              value={targetLanguage}
              onChange={setTargetLanguage}
              options={LANGUAGE_OPTIONS}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="btn-row">
        <button type="submit" className="btn btn--primary btn--lg" disabled={submitting || !audio}>
          {submitting && <span className="spinner" />}
          {submitting ? t.compose.submitting : t.compose.submit}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            {t.common.cancel}
          </button>
        )}
      </div>
    </form>
  )
}
