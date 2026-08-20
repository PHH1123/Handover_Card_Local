/**
 * API 는 ISO 639-1 두 글자 코드를 받는다 (명세 예시: sourceLanguage="en", targetLanguage="ko").
 * 데모에서 고를 만한 언어만 추렸다.
 */
export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const

export function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code
}
