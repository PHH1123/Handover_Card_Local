import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { members } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n/LanguageContext'
import { formatDateTime } from '../lib/format'

export function SettingsPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const t = useT()

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{t.settings.title}</h1>
        <p className="page-subtitle">{user?.email}</p>
      </div>

      <NameSection currentName={user?.name ?? ''} onSaved={refreshUser} />
      <PasswordSection />
      <DangerSection
        onDeleted={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      />

      {user && (
        <p className="faint" style={{ marginTop: 20, textAlign: 'center' }}>
          {t.settings.joinedAt(formatDateTime(user.createdAt))}
        </p>
      )}
    </>
  )
}

function NameSection({
  currentName,
  onSaved,
}: {
  currentName: string
  onSaved: () => Promise<void>
}) {
  const t = useT()
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const unchanged = name.trim() === currentName.trim()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy || unchanged) return

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await members.updateName(name.trim())
      await onSaved()
      setNotice(t.settings.nameChanged)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.settings.nameFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="section-title">{t.settings.displayName}</h2>

      {error && (
        <div className="alert alert--error form-alert" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="alert alert--info form-alert">{notice}</div>}

      {/* 아래 「비밀번호 변경」 과 같은 간격을 둔다 */}
      <form onSubmit={handleSubmit} className="btn-row" style={{ marginTop: 14 }}>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={t.settings.displayName}
          required
        />
        <button type="submit" className="btn btn--primary" disabled={busy || unchanged}>
          {t.common.save}
        </button>
      </form>
    </div>
  )
}

function PasswordSection() {
  const t = useT()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return

    if (newPassword.length < 8) {
      setError(t.settings.passwordShort)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.settings.passwordMismatch)
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await members.changePassword(currentPassword, newPassword)
      setNotice(t.settings.passwordChanged)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (caught) {
      // 현재 비밀번호가 틀리면 서버가 401 을 준다. 자동 로그아웃될 상황이 아니므로 그대로 안내한다.
      const message =
        caught instanceof ApiError && caught.status === 401
          ? t.settings.passwordWrong
          : caught instanceof ApiError
            ? caught.message
            : t.settings.passwordFailed
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="section-title">{t.settings.passwordTitle}</h2>

      {error && (
        <div className="alert alert--error form-alert" style={{ marginTop: 14 }} role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert--info form-alert" style={{ marginTop: 14 }}>
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
        <div className="field">
          <label className="field-label" htmlFor="currentPassword">
            {t.settings.currentPassword}
          </label>
          <input
            id="currentPassword"
            className="input"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="field-row" style={{ marginTop: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="newPassword">
              {t.settings.newPassword}
            </label>
            <input
              id="newPassword"
              className="input"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <span className="field-hint">{t.settings.passwordHint}</span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="confirmPassword">
              {t.settings.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn--primary" style={{ marginTop: 20 }} disabled={busy}>
          {busy && <span className="spinner" />}
          {t.settings.changePassword}
        </button>
      </form>
    </div>
  )
}

function DangerSection({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!window.confirm(t.settings.confirmDelete)) return

    setBusy(true)
    setError(null)
    try {
      await members.deleteAccount()
      await onDeleted()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.settings.deleteFailed)
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="section-title">{t.settings.dangerTitle}</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        {t.settings.deleteNote}
      </p>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn--danger"
        style={{ marginTop: 14 }}
        onClick={handleDelete}
        disabled={busy}
      >
        {busy && <span className="spinner" />}
        {t.settings.deleteAccount}
      </button>
    </div>
  )
}
