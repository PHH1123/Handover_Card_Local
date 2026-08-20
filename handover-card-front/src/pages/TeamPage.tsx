import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { teams } from '../api/endpoints'
import type { JoinRequestResponse, TeamDetailResponse, TeamResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n/LanguageContext'
import { messages } from '../i18n/messages'
import { formatRelative } from '../lib/format'

interface TeamState {
  /** 소속 팀. 없으면 null (서버가 404 를 준다) */
  myTeam: TeamDetailResponse | null
  /** 팀이 없을 때 고를 수 있는 전체 팀 목록 */
  allTeams: TeamResponse[]
  /** 팀이 없을 때: 내가 낸 신청 / 팀장일 때: 내 팀에 들어온 신청 */
  myRequests: JoinRequestResponse[]
  pendingRequests: JoinRequestResponse[]
}

const EMPTY: TeamState = { myTeam: null, allTeams: [], myRequests: [], pendingRequests: [] }

export function TeamPage() {
  const { user } = useAuth()
  const t = useT()
  const [state, setState] = useState<TeamState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      // 소속 팀이 없으면 404 가 정상 응답이므로 팀 없음으로 해석한다.
      const myTeam = await teams.myTeam().catch((caught) => {
        if (caught instanceof ApiError && caught.status === 404) return null
        throw caught
      })

      if (!myTeam) {
        const [allTeams, myRequests] = await Promise.all([teams.list(), teams.myJoinRequests()])
        setState({ myTeam: null, allTeams, myRequests, pendingRequests: [] })
        return
      }

      // 대기 중인 신청 목록은 팀장만 조회할 수 있다.
      const pendingRequests = myTeam.leader
        ? await teams.pendingJoinRequests().catch(() => [])
        : []
      setState({ myTeam, allTeams: [], myRequests: [], pendingRequests })
    } catch (caught) {
      // 이 콜백은 언어에 묶이면 안 된다. 묶으면 언어를 바꿀 때마다 팀 정보를 다시 부른다.
      setError(caught instanceof ApiError ? caught.message : messages().team.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 팀 관련 동작을 실행하고 성공하면 화면을 다시 불러온다. */
  async function run(action: () => Promise<unknown>, successMessage: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(successMessage)
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.team.actionFailed)
    } finally {
      setBusy(false)
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
        <h1 className="page-title">{t.team.title}</h1>
        <p className="page-subtitle">{t.team.subtitle}</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert--info" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      )}

      {state.myTeam ? (
        <MyTeam team={state.myTeam} pending={state.pendingRequests} busy={busy} run={run} />
      ) : (
        <NoTeam
          allTeams={state.allTeams}
          myRequests={state.myRequests}
          currentEmail={user?.email ?? ''}
          busy={busy}
          run={run}
        />
      )}
    </>
  )
}

type Run = (action: () => Promise<unknown>, successMessage: string) => Promise<void>

// ---------- 팀에 소속된 경우 ----------

function MyTeam({
  team,
  pending,
  busy,
  run,
}: {
  team: TeamDetailResponse
  pending: JoinRequestResponse[]
  busy: boolean
  run: Run
}) {
  const t = useT()
  // 팀장을 맨 위로. 서버가 주는 순서에 팀장이 섞여 있어 누가 팀장인지 찾아야 했다.
  const members = [...team.members].sort((a, b) => Number(b.leader) - Number(a.leader))

  return (
    <>
      <div className="panel">
        <div className="spread">
          <div>
            <h2 className="page-title" style={{ fontSize: 19 }}>
              {team.name}
            </h2>
            <p className="faint" style={{ marginTop: 4 }}>
              {t.team.summary(team.leaderName, team.members.length, formatRelative(team.createdAt))}
            </p>
          </div>
          {team.leader && <span className="badge badge--done">{t.common.leaderTag}</span>}
        </div>

        <div className="member-list">
          {members.map((member) => (
            <div key={member.memberId} className="member-row">
              <div>
                <span className="member-name">
                  {member.name}
                  {member.leader && <span className="member-tag">{t.common.leaderTag}</span>}
                </span>
                <span className="faint" style={{ display: 'block' }}>
                  {member.email}
                </span>
              </div>

              {team.leader && !member.leader && (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(t.team.confirmTransfer(member.name))) return
                      void run(
                        () => teams.transferLeadership(member.memberId),
                        t.team.transferDone(member.name),
                      )
                    }}
                  >
                    {t.team.transfer}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(t.team.confirmKick(member.name))) return
                      void run(() => teams.kickMember(member.memberId), t.team.kickDone(member.name))
                    }}
                  >
                    {t.team.kick}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {team.leader && (
        <div className="panel">
          <h2 className="section-title">{t.team.receivedTitle}</h2>
          {pending.length === 0 ? (
            <p className="muted" style={{ marginTop: 10 }}>
              {t.team.noPending}
            </p>
          ) : (
            <div className="member-list">
              {pending.map((request) => (
                <div key={request.id} className="member-row">
                  <div>
                    <span className="member-name">{request.memberName}</span>
                    <span className="faint" style={{ display: 'block' }}>
                      {request.memberEmail} · {t.team.requestedAt(formatRelative(request.requestedAt))}
                    </span>
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => teams.approveJoinRequest(request.id),
                          t.team.approveDone(request.memberName),
                        )
                      }
                    >
                      {t.team.approve}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => teams.rejectJoinRequest(request.id),
                          t.team.rejectDone(request.memberName),
                        )
                      }
                    >
                      {t.team.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h2 className="section-title">{t.team.dangerTitle}</h2>
        {team.leader ? (
          <>
            <p className="muted" style={{ marginTop: 8 }}>
              {t.team.leaderCannotLeave}
            </p>
            <button
              type="button"
              className="btn btn--danger"
              style={{ marginTop: 14 }}
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t.team.confirmDeleteTeam(team.name))) return
                void run(() => teams.remove(), t.team.deleteTeamDone)
              }}
            >
              {t.team.deleteTeam}
            </button>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 8 }}>
              {t.team.leaveNote}
            </p>
            <button
              type="button"
              className="btn btn--danger"
              style={{ marginTop: 14 }}
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t.team.confirmLeave(team.name))) return
                void run(() => teams.leave(), t.team.leaveDone)
              }}
            >
              {t.team.leaveTeam}
            </button>
          </>
        )}
      </div>
    </>
  )
}

// ---------- 팀이 없는 경우 ----------

function NoTeam({
  allTeams,
  myRequests,
  currentEmail,
  busy,
  run,
}: {
  allTeams: TeamResponse[]
  myRequests: JoinRequestResponse[]
  currentEmail: string
  busy: boolean
  run: Run
}) {
  const t = useT()
  const [teamName, setTeamName] = useState('')
  const pendingRequest = myRequests.find((request) => request.status === 'PENDING')

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    const name = teamName.trim()
    if (!name) return
    void run(() => teams.create(name), t.team.createDone(name)).then(() => setTeamName(''))
  }

  return (
    <>
      <div className="panel">
        <h2 className="panel-title">{t.team.createTitle}</h2>
        <p className="panel-note">{t.team.createNote}</p>

        <form onSubmit={handleCreate} className="stack-form">
          <div className="field">
            <label className="field-label" htmlFor="teamName">
              {t.team.nameLabel}
            </label>
            <input
              id="teamName"
              className="input"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder={t.team.namePlaceholder}
              maxLength={50}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy || !teamName.trim()}>
            {t.team.createButton}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="panel-title">{t.team.joinTitle}</h2>
        <p className="panel-note">{t.team.joinNote}</p>

        {pendingRequest && (
          <div className="alert alert--info" style={{ marginTop: 16 }}>
            {t.team.alreadyApplied(pendingRequest.teamName)}
          </div>
        )}

        {allTeams.length === 0 ? (
          <p className="muted" style={{ marginTop: 16 }}>
            {t.team.noTeams}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.team.colTeamName}</th>
                  <th>{t.team.colLeader}</th>
                  <th>{t.team.colMembers}</th>
                  <th>{t.team.colApply}</th>
                </tr>
              </thead>
              <tbody>
                {allTeams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td className="muted">{team.leaderName}</td>
                    <td className="num">{t.team.memberCount(team.memberCount)}</td>
                    <td>
                      {team.leaderEmail === currentEmail ? (
                        <span className="faint">{t.team.ownTeam}</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={busy || Boolean(pendingRequest)}
                          onClick={() =>
                            void run(() => teams.apply(team.id), t.team.applyDone(team.name))
                          }
                        >
                          {t.team.apply}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {myRequests.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">{t.team.myRequestsTitle}</h2>
          <p className="panel-note">{t.team.myRequestsNote}</p>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.team.colTeam}</th>
                  <th>{t.team.colStatus}</th>
                  <th>{t.team.colRequestedAt}</th>
                  <th>{t.team.colCancel}</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.teamName}</td>
                    <td>
                      <JoinStatusBadge status={request.status} />
                    </td>
                    <td className="muted">{formatRelative(request.requestedAt)}</td>
                    <td>
                      {/* 이미 승인·거절된 신청은 서버가 409 로 막는다. 버튼 자체를 두지 않는다. */}
                      {request.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="btn btn--danger"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(t.team.confirmCancelRequest(request.teamName))) return
                            void run(
                              () => cancelJoinRequest(request.id, t.team.cancelRequestGone),
                              t.team.cancelRequestDone(request.teamName),
                            )
                          }}
                        >
                          {t.team.cancelRequest}
                        </button>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * 가입 신청 취소.
 *
 * 화면이 목록을 들고 있는 사이에 팀장이 승인·거절하면 409 가 온다. API 가 에러 본문
 * 형식을 명세하지 않아 서버 문구를 그대로 띄우면 뜻이 통하지 않으므로 바꿔 준다.
 * 404(내 신청이 아니거나 이미 사라짐)도 사용자에게는 같은 상황이다.
 */
async function cancelJoinRequest(requestId: number, goneMessage: string) {
  try {
    await teams.cancelJoinRequest(requestId)
  } catch (caught) {
    if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
      throw new ApiError(caught.status, goneMessage, caught.body)
    }
    throw caught
  }
}

function JoinStatusBadge({ status }: { status: JoinRequestResponse['status'] }) {
  const t = useT()
  const config = {
    PENDING: { label: t.team.joinPending, className: 'badge--pending' },
    APPROVED: { label: t.team.joinApproved, className: 'badge--done' },
    REJECTED: { label: t.team.joinRejected, className: 'badge--failed' },
  }[status]

  return (
    <span className={`badge ${config.className}`}>
      <span className="badge-dot" aria-hidden="true" />
      {config.label}
    </span>
  )
}
