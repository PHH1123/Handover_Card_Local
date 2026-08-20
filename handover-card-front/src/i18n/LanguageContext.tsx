import { createContext, useContext } from 'react'
import type { Lang, Messages } from './messages'

export interface LanguageValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** 지금 언어의 문구 묶음 */
  t: Messages
}

export const LanguageContext = createContext<LanguageValue | null>(null)

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage 는 LanguageProvider 안에서만 쓸 수 있습니다.')
  return value
}

/** 문구만 필요할 때 쓰는 지름길. */
export function useT(): Messages {
  return useLanguage().t
}
