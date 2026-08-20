import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext } from './LanguageContext'
import { MESSAGES, setActiveLang, type Lang } from './messages'

const STORAGE_KEY = 'handover.lang'

function readSaved(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'ko' || saved === 'en' ? saved : null
  } catch {
    // 사생활 보호 모드에서는 localStorage 접근이 막힐 수 있다. 그때는 브라우저 설정만 본다.
    return null
  }
}

/**
 * 고른 언어가 없으면 브라우저 설정을 따른다.
 * 이 제품은 외국인 동료가 받는 쪽이라, 한국어 사용자가 아니면 영어로 열리는 편이 맞다.
 */
function initialLang(): Lang {
  const saved = readSaved()
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 저장에 실패해도 이번 세션 동안은 바뀐 언어로 쓸 수 있다.
    }
  }, [])

  useEffect(() => {
    // 훅을 못 쓰는 자리(api/client.ts 등)가 참고할 수 있도록 함께 맞춰 둔다.
    setActiveLang(lang)
    // 스크린리더와 브라우저 번역기가 문서 언어를 보고 판단한다.
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang] }), [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
