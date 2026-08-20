import { useEffect, useRef, useState, type DragEvent } from 'react'
import { formatDuration } from '../hooks/useAudioRecorder'
import { useT } from '../i18n/LanguageContext'
import { AudioPreview, formatSize } from './AudioPreview'

/** 파일 선택 대화상자에서 걸러줄 확장자·타입. 브라우저가 audio/* 를 못 채우는 경우가 있어 확장자도 함께 준다. */
const ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm,.ogg,.oga,.aac,.flac,.opus'

/** 이 이상이면 업로드가 오래 걸리거나 서버에서 거부될 수 있어 미리 알려준다. */
const SIZE_WARNING_BYTES = 25 * 1024 * 1024

/** 확장자만 보고 오디오로 인정할 목록. type 이 빈 문자열로 오는 파일이 있다. */
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'oga', 'aac', 'flac', 'opus', 'mp4']

function looksLikeAudio(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  const extension = file.name.split('.').pop()?.toLowerCase()
  return Boolean(extension && AUDIO_EXTENSIONS.includes(extension))
}

/** 녹음 데크와 같은 골격을 쓴다. 두 방식이 형제로 보이도록. */
export function AudioFilePicker({
  file,
  onSelect,
}: {
  file: File | null
  onSelect: (file: File | null) => void
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  /** 재생기가 파일을 읽어 알려준 실제 길이(초). 아직 모르면 null. */
  const [duration, setDuration] = useState<number | null>(null)

  // 미리듣기 URL 은 파일이 바뀌거나 화면을 벗어날 때 반드시 해제해야 메모리가 새지 않는다.
  useEffect(() => {
    // 파일이 바뀌면 이전 파일의 길이가 남아 있지 않도록 함께 비운다.
    setDuration(null)

    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function accept(candidate: File | undefined) {
    if (!candidate) return

    if (!looksLikeAudio(candidate)) {
      setError(t.filePicker.errorNotAudio(candidate.type || t.filePicker.unknownType))
      return
    }
    if (candidate.size === 0) {
      setError(t.filePicker.errorEmpty)
      return
    }

    setError(null)
    onSelect(candidate)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    accept(event.dataTransfer.files[0])
  }

  function clear() {
    setError(null)
    onSelect(null)
    // 같은 파일을 다시 고를 수 있도록 input 값을 비운다.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="deck">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="visually-hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      <div className="deck-top">
        <div className="deck-counter">
          <span className={`deck-status${file ? ' deck-status--done' : ''}`}>
            <i aria-hidden="true" />
            {file ? 'READY' : 'FILE'}
          </span>
          <span className={`deck-value${file ? '' : ' deck-value--idle'}`}>
            {/* 길이는 파일을 읽어야 알 수 있어서 잠깐 --:-- 로 나온다 */}
            <span className="deck-duration">
              {duration !== null ? formatDuration(Math.round(duration)) : '--:--'}
            </span>
            {file && (
              <>
                <span className="deck-sep" aria-hidden="true">
                  |
                </span>
                <span className="deck-filename" title={file.name}>
                  {file.name}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="btn-row">
          <button
            type="button"
            className={file ? 'btn' : 'btn btn--primary'}
            onClick={() => inputRef.current?.click()}
          >
            {file ? t.filePicker.changeFile : t.filePicker.choose}
          </button>
          {file && (
            <button type="button" className="btn btn--ghost" onClick={clear}>
              {t.common.cancel}
            </button>
          )}
        </div>
      </div>

      <div className="deck-rule" />

      {file && previewUrl ? (
        <AudioPreview
          src={previewUrl}
          blob={file}
          filename={file.name}
          onDuration={setDuration}
        />
      ) : (
        <div
          className={`deck-drop${dragging ? ' deck-drop--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span className="muted" style={{ fontSize: 13.5 }}>
            {t.filePicker.dropHere}
          </span>
          <span className="faint" style={{ fontSize: 12 }}>
            mp3 · m4a · wav · webm · ogg
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {file && file.size > SIZE_WARNING_BYTES && (
        <div className="alert alert--info">{t.filePicker.sizeWarning(formatSize(file.size))}</div>
      )}

      <div className="deck-bottom">
        <span className="deck-hint">
          {file ? t.filePicker.hintReady : t.filePicker.hintIdle}
        </span>
      </div>
    </div>
  )
}
