import { useCallback, useEffect, useRef, useState } from 'react'
import { messages } from '../i18n/messages'

export type RecorderState = 'idle' | 'recording' | 'paused' | 'recorded'

/** 브라우저마다 지원하는 컨테이너가 달라서 되는 것 중 첫 번째를 고른다. (Safari 는 mp4) */
function pickMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

export interface AudioRecorder {
  state: RecorderState
  /** 녹음 경과 시간(초) */
  elapsed: number
  /** 현재 입력 음량 0~1. 파형 시각화에 쓴다. */
  level: number
  /** 실제로 소리를 받고 있는 입력 장치 이름. 권한을 준 뒤에만 채워진다. */
  deviceLabel: string | null
  blob: Blob | null
  /** 미리듣기용 object URL */
  previewUrl: string | null
  error: string | null
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}

export function useAudioRecorder(): AudioRecorder {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  /** 마이크·오디오 분석기·타이머를 모두 정리한다. 중복 호출해도 안전하다. */
  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setLevel(0)
  }, [])

  // 페이지를 벗어날 때 마이크가 계속 켜져 있지 않도록 정리한다.
  useEffect(() => teardown, [teardown])

  // 미리듣기 URL 은 교체·해제 시점에 반드시 revoke 해야 메모리가 새지 않는다.
  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const start = useCallback(async () => {
    setError(null)
    setBlob(null)
    chunksRef.current = []
    setElapsed(0)

    // https 나 localhost 가 아니면 브라우저가 mediaDevices 자체를 노출하지 않는다.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(messages().recorder.errorInsecure)
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError(messages().recorder.errorUnsupported)
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : ''
      const t = messages().recorder
      setError(
        name === 'NotAllowedError'
          ? t.errorDenied
          : name === 'NotFoundError'
            ? t.errorNoDevice
            : t.errorOpen,
      )
      return
    }

    streamRef.current = stream

    // 브라우저가 실제로 연 장치 이름. 권한을 주기 전에는 빈 문자열이라 그때는 감춘다.
    setDeviceLabel(stream.getAudioTracks()[0]?.label || null)

    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    console.info(
      `[handover] 녹음 형식: ${recorder.mimeType || '(미지정)'} (요청한 형식: ${mimeType ?? '브라우저 기본값'})`,
    )

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorder.onstop = () => {
      const recorded = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      teardown()

      // 소리가 한 조각도 안 들어왔으면 업로드해도 의미가 없으니 처음 상태로 되돌린다.
      if (recorded.size === 0) {
        setError(messages().recorder.errorEmpty)
        setState('idle')
        return
      }

      setBlob(recorded)
      setState('recorded')
    }

    recorder.onerror = () => {
      setError(messages().recorder.errorFailed)
      teardown()
      setState('idle')
    }

    // 입력 음량을 읽어 녹음 중임을 시각적으로 보여준다.
    try {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      audioContext.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteTimeDomainData(buffer)
        let sum = 0
        for (const sample of buffer) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }
        // RMS 를 0~1 로 눌러 담는다. 3배는 육안으로 반응이 보이게 하는 경험적 배율.
        setLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 3))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // 음량 시각화는 없어도 녹음 자체에는 지장이 없다.
    }

    timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000)

    // timeslice 를 주지 않는다. 조각으로 나눠 받아 이어 붙이면 컨테이너 헤더가 어긋나
    // 재생 못 하는 파일이 나오는 경우가 있는데, 업로드는 녹음이 끝난 뒤 한 번뿐이라
    // 조각낼 이유가 없다. 이러면 브라우저가 완결된 파일 하나를 만들어 준다.
    recorder.start()
    setState('recording')
  }, [teardown])

  const pause = useCallback(() => {
    if (recorderRef.current?.state !== 'recording') return
    recorderRef.current.pause()
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    if (recorderRef.current?.state !== 'paused') return
    recorderRef.current.resume()
    timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    setState('recording')
  }, [])

  const stop = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return
    recorderRef.current.stop() // 나머지 정리는 onstop 에서 한다.
  }, [])

  const reset = useCallback(() => {
    teardown()
    chunksRef.current = []
    setBlob(null)
    setElapsed(0)
    setError(null)
    setDeviceLabel(null)
    setState('idle')
  }, [teardown])

  return {
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
  }
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
