import { useState } from 'react'
import { useT } from '../i18n/LanguageContext'
import { AudioPlayer, type PlayerHealth } from './AudioPlayer'

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 저장 파일에 붙일 확장자. 컨테이너에 맞아야 다른 재생기가 바로 열어준다. */
function downloadExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

/**
 * 녹음 결과와 업로드 파일의 미리듣기. 재생기 아래에 용량·길이·형식을 함께 적는다.
 * 재생 가능 여부는 오디오 엘리먼트가 직접 알려주는 것만 믿는다.
 */
export function AudioPreview({
  src,
  blob,
  seconds,
  filename,
  onDuration,
}: {
  src: string
  blob: Blob
  /** 녹음 중 세어 둔 길이(초). 업로드 파일은 넘기지 않는다. */
  seconds?: number
  /** 저장 링크에 붙일 원본 파일명. 표시는 부모가 담당한다. */
  filename?: string
  /** 재생기가 알아낸 실제 길이를 부모에게 올려보낸다. */
  onDuration?: (seconds: number | null) => void
}) {
  const t = useT()
  const [health, setHealth] = useState<PlayerHealth>({ kind: 'checking' })

  const format = blob.type || t.preview.noFormat
  const broken = health.kind === 'broken'

  return (
    <div className="audio-preview">
      {/*
        재생이 안 되는 파일이면 재생기를 감추고 아래 안내로 대체한다.
        엘리먼트 자체는 남겨둬야 오류 상태를 계속 알려줄 수 있으므로 언마운트하지 않는다.
      */}
      <div className={broken ? 'visually-hidden' : undefined}>
        <AudioPlayer
          src={src}
          knownSeconds={seconds}
          onHealthChange={setHealth}
          onDurationChange={onDuration}
        />
      </div>

      {/* 길이는 재생기가, 파일명은 데크 머리글이 보여주므로 여기서는 되풀이하지 않는다 */}
      <p className="faint audio-preview-meta">
        {formatSize(blob.size)} · {format} ·{' '}
        <a
          className="audio-preview-save"
          href={src}
          download={filename ?? `handover-recording.${downloadExtension(format)}`}
        >
          {t.preview.save}
        </a>
      </p>

      {broken && (
        <div className="alert alert--info" style={{ marginTop: 10 }}>
          <strong>{t.preview.brokenTitle}</strong>
          <p style={{ marginTop: 6, fontSize: 13 }}>
            {t.preview.brokenBodyBefore}
            <b>{t.preview.brokenBodyStrong}</b>
            {t.preview.brokenBodyAfter}
          </p>
          <p style={{ marginTop: 6, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {t.preview.format}: {format}
            <br />
            {health.reason}
          </p>
        </div>
      )}
    </div>
  )
}
