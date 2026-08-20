import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../hooks/useAudioRecorder'
import { useT } from '../i18n/LanguageContext'
import { messages } from '../i18n/messages'

export type PlayerHealth = { kind: 'checking' } | { kind: 'playable' } | { kind: 'broken'; reason: string }

/** MediaError 코드는 원인이 완전히 다르므로 구분해서 알려준다. */
function describeMediaError(error: MediaError | null): string {
  const t = messages().player
  if (!error) return t.unknownError
  const labels: Record<number, string> = {
    1: t.aborted,
    2: t.network,
    3: t.decode,
    4: t.unsupported,
  }
  const label = labels[error.code] ?? t.code(error.code)
  return error.message ? `${label} (${error.message})` : label
}

/**
 * 디자인에 맞춘 재생기.
 *
 * 브라우저 기본 컨트롤은 이 화면 톤과 맞지 않아 직접 그린다.
 *
 * 탐색(드래그)은 **브라우저가 실제 길이를 아는 경우에만** 허용한다.
 * MediaRecorder 가 만든 webm 에는 전체 길이가 없어 duration 이 Infinity 로 오는데,
 * 그 상태에서 재생 위치를 옮기면 오디오가 끝에 멈춰 재생이 아예 막힌다.
 * 그래서 길이를 모를 때는 녹음 중 세어 둔 초로 진행률만 보여주고 탐색은 잠근다.
 */
export function AudioPlayer({
  src,
  /** 알고 있는 길이(초). 녹음 결과처럼 엘리먼트가 길이를 모를 때 쓴다. */
  knownSeconds,
  onHealthChange,
  onDurationChange,
}: {
  src: string
  knownSeconds?: number
  onHealthChange?: (health: PlayerHealth) => void
  /** 엘리먼트가 실제 길이를 알아냈을 때 알려준다. 헤더 등 바깥에서 쓰기 위한 것. */
  onDurationChange?: (seconds: number | null) => void
}) {
  const t = useT()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  /** 엘리먼트가 스스로 알아낸 길이. Infinity 면 null 로 둔다. */
  const [nativeDuration, setNativeDuration] = useState<number | null>(null)

  // 콜백이 매 렌더 새 함수여도 effect 가 다시 돌지 않도록 ref 에 담아둔다.
  const healthRef = useRef(onHealthChange)
  healthRef.current = onHealthChange
  const durationRef = useRef(onDurationChange)
  durationRef.current = onDurationChange

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    setPlaying(false)
    setCurrentTime(0)
    setNativeDuration(null)
    healthRef.current?.({ kind: 'checking' })
    durationRef.current?.(null)

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setNativeDuration(audio.duration)
        durationRef.current?.(audio.duration)
      }
    }
    const markPlayable = () => {
      readDuration()
      healthRef.current?.({ kind: 'playable' })
    }
    const markBroken = () =>
      healthRef.current?.({ kind: 'broken', reason: describeMediaError(audio.error) })

    const onTime = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', markPlayable)
    audio.addEventListener('durationchange', readDuration)
    audio.addEventListener('canplay', markPlayable)
    audio.addEventListener('error', markBroken)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    // 리스너를 붙이기 전에 이미 결론이 난 경우를 놓치지 않는다.
    if (audio.error) markBroken()
    else if (audio.readyState >= 2) markPlayable()

    return () => {
      audio.removeEventListener('loadedmetadata', markPlayable)
      audio.removeEventListener('durationchange', readDuration)
      audio.removeEventListener('canplay', markPlayable)
      audio.removeEventListener('error', markBroken)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => undefined)
    else audio.pause()
  }

  // 진행률 표시에 쓸 길이: 엘리먼트가 아는 값을 우선하고, 없으면 녹음 시간으로 대체
  const displayDuration = nativeDuration ?? (knownSeconds && knownSeconds > 0 ? knownSeconds : null)
  const seekable = nativeDuration !== null
  const percent =
    displayDuration && displayDuration > 0
      ? Math.min(100, (currentTime / displayDuration) * 100)
      : 0

  return (
    <div className="player">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        className="player-btn"
        onClick={toggle}
        aria-label={playing ? t.player.pause : t.player.play}
      >
        {playing ? (
          <svg width="13" height="14" viewBox="0 0 13 14" aria-hidden="true">
            <rect x="1" y="1" width="3.6" height="12" rx="1.1" fill="currentColor" />
            <rect x="8.4" y="1" width="3.6" height="12" rx="1.1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="13" height="14" viewBox="0 0 13 14" aria-hidden="true">
            <path d="M2 1.6a1 1 0 0 1 1.5-.87l8 5.4a1 1 0 0 1 0 1.74l-8 5.4A1 1 0 0 1 2 12.4z" fill="currentColor" />
          </svg>
        )}
      </button>

      {seekable ? (
        <input
          type="range"
          className="player-seek"
          min={0}
          max={displayDuration ?? 0}
          step={0.05}
          value={currentTime}
          aria-label={t.player.seek}
          style={{ '--played': `${percent}%` } as React.CSSProperties}
          onChange={(event) => {
            const audio = audioRef.current
            if (!audio) return
            const next = Number(event.target.value)
            audio.currentTime = next
            setCurrentTime(next)
          }}
        />
      ) : (
        // 길이를 모르는 파일: 재생 위치를 건드리면 재생이 막히므로 진행만 보여준다.
        <div
          className="player-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label={t.player.progress}
        >
          <span className="player-track-fill" style={{ width: `${percent}%` }} />
        </div>
      )}

      <span className="player-time">
        {formatDuration(Math.floor(currentTime))}
        <span className="player-time-total">
          {' / '}
          {displayDuration ? formatDuration(Math.round(displayDuration)) : '--:--'}
        </span>
      </span>
    </div>
  )
}
