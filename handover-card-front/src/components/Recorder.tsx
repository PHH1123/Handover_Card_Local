import { useEffect, useRef, useState } from 'react'
import { formatDuration, type AudioRecorder, type RecorderState } from '../hooks/useAudioRecorder'
import { useT } from '../i18n/LanguageContext'
import { AudioPreview } from './AudioPreview'

/** 막대 하나가 차지하는 가로 폭(px). 막대 3px + 간격 2px — CSS 와 맞춰야 한다. */
const BAR_SLOT = 5

/** 음량을 파형에 한 칸 찍는 주기(ms). 짧을수록 빨리 오른쪽으로 나아간다. */
const SAMPLE_MS = 70

const STATUS: Record<RecorderState, { label: string; modifier: string }> = {
  idle: { label: 'READY', modifier: '' },
  recording: { label: 'REC', modifier: ' deck-status--live' },
  paused: { label: 'PAUSED', modifier: ' deck-status--paused' },
  recorded: { label: 'DONE', modifier: ' deck-status--done' },
}


export function Recorder({ recorder }: { recorder: AudioRecorder }) {
  const {
    state,
    elapsed,
    level,
    deviceLabel,
    blob,
    previewUrl,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  } = recorder

  const t = useT()
  const status = STATUS[state]
  const isLive = state === 'recording' || state === 'paused'

  const hint: Record<RecorderState, string> = {
    idle: t.recorder.hintIdle,
    recording: t.recorder.hintRecording,
    paused: t.recorder.hintPaused,
    recorded: t.recorder.hintDone,
  }

  return (
    <div className="deck">
      <div className="deck-top">
        <div className="deck-counter">
          <span className={`deck-status${status.modifier}`}>
            <i aria-hidden="true" />
            {status.label}
          </span>
          <span className="deck-time">
            <span className={`deck-value${state === 'idle' ? ' deck-value--idle' : ''}`}>
              {formatDuration(elapsed)}
            </span>
            {/* 어느 마이크로 들어오고 있는지. 이름이 길어 잘리므로 전체는 툴팁으로 둔다. */}
            {deviceLabel && (
              <span className="deck-device" title={deviceLabel}>
                {deviceLabel}
              </span>
            )}
          </span>
        </div>

        {state === 'idle' && (
          <button
            type="button"
            className="rec-btn"
            onClick={() => void start()}
            aria-label={t.recorder.start}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="7" fill="currentColor" />
            </svg>
          </button>
        )}

        {/*
          녹음 중에는 큰 버튼이 멈춤/이어하기를 맡고, 그 왼쪽 작은 네모가 녹음을 끝낸다.
          끝내기를 큰 버튼에 두면 잠깐 멈추려다 녹음을 끝내 버리는 사고가 난다.
        */}
        {isLive && (
          <div className="rec-controls">
            <button
              type="button"
              className="rec-btn rec-btn--sm"
              onClick={stop}
              aria-label={t.recorder.finish}
              title={t.recorder.finish}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
                <rect x="0.5" y="0.5" width="12" height="12" rx="2" fill="currentColor" />
              </svg>
            </button>

            {state === 'recording' ? (
              <button
                type="button"
                className="rec-btn rec-btn--live"
                onClick={pause}
                aria-label={t.recorder.pause}
                title={t.recorder.pause}
              >
                <svg width="15" height="16" viewBox="0 0 15 16" aria-hidden="true">
                  <rect x="1" y="1" width="4.5" height="14" rx="1.6" fill="currentColor" />
                  <rect x="9.5" y="1" width="4.5" height="14" rx="1.6" fill="currentColor" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="rec-btn rec-btn--live"
                onClick={resume}
                aria-label={t.recorder.resume}
                title={t.recorder.resume}
              >
                <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="7" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
        )}

        {state === 'recorded' && (
          <button type="button" className="btn" onClick={reset}>
            {t.recorder.reRecord}
          </button>
        )}
      </div>

      <div className="deck-rule" />

      {state === 'recorded' && previewUrl && blob ? (
        <AudioPreview src={previewUrl} blob={blob} seconds={elapsed} />
      ) : (
        <LevelMeter level={level} state={state} />
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {/* 멈춤·이어하기·완료가 모두 위쪽 버튼으로 올라갔으므로 여기는 안내문만 남는다 */}
      <div className="deck-bottom">
        <span className="deck-hint">{hint[state]}</span>
      </div>
    </div>
  )
}

/**
 * 지나간 음량을 그대로 남기는 파형. 빈 칸에서 시작해 왼쪽부터 한 칸씩 채워 나가고,
 * 오른쪽 끝까지 차면 그때부터 왼쪽으로 밀어 내며 계속 나아간다.
 * 채우는 동안에는 이미 그린 막대가 움직이지 않아 "여기까지 왔다" 가 그대로 보이고,
 * 밀어 내기 시작하면 막대 키가 index 로 고정돼 있어 CSS transition 이 사이를 메워 준다.
 */
function LevelMeter({ level, state }: { level: number; state: RecorderState }) {
  const laneRef = useRef<HTMLDivElement>(null)
  const [capacity, setCapacity] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const levelRef = useRef(0)

  // 음량은 매 프레임 갱신되지만 파형은 SAMPLE_MS 마다 한 칸씩만 찍는다.
  // 그래서 최신 값을 ref 에 받아 두고 아래 타이머가 꺼내 쓴다.
  useEffect(() => {
    levelRef.current = level
  }, [level])

  // 화면 폭에 따라 담을 수 있는 막대 수가 달라진다. 창 크기가 바뀌면 다시 잰다.
  useEffect(() => {
    const lane = laneRef.current
    if (!lane) return
    const measure = () => setCapacity(Math.max(1, Math.floor(lane.clientWidth / BAR_SLOT)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(lane)
    return () => observer.disconnect()
  }, [])

  // 처음 상태로 돌아오면 그려 둔 파형도 지운다. 다음 녹음은 다시 빈 칸에서 시작한다.
  useEffect(() => {
    if (state === 'idle') setHistory([])
  }, [state])

  const running = state === 'recording'

  useEffect(() => {
    // 일시정지면 나아가기를 멈춰 세운다. 지금까지 그린 파형은 그대로 남는다.
    if (!running || capacity === 0) return
    const id = window.setInterval(() => {
      setHistory((previous) => {
        const next = [...previous, levelRef.current]
        return next.length > capacity ? next.slice(next.length - capacity) : next
      })
    }, SAMPLE_MS)
    return () => window.clearInterval(id)
  }, [running, capacity])

  // 끝까지 찬 뒤에는 왼쪽 끝이 흐려지며 밀려 나가야 흐르는 방향이 보인다.
  const rolling = capacity > 0 && history.length >= capacity

  return (
    <div
      ref={laneRef}
      className={`deck-wave${rolling ? ' deck-wave--rolling' : ''}`}
      aria-hidden="true"
    >
      {history.map((value, index) => (
        // 침묵도 2px 짜리 선으로 남겨야 "녹음은 되고 있는데 소리가 없다" 가 구분된다.
        <i key={index} style={{ height: `${2 + value * 30}px` }} />
      ))}
    </div>
  )
}
