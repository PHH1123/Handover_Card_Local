import { useLanguage } from './LanguageContext'
import { LANG_LABEL, type Lang } from './messages'

const OPTIONS: Lang[] = ['ko', 'en']

/**
 * 언어 전환. 고르는 항목이 둘뿐이라 목록을 펼치지 않고 나란히 둔다.
 * 각 언어를 자기 이름으로 적어야, 지금 못 읽는 언어에 갇힌 사람도 빠져나올 수 있다.
 */
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className="lang-toggle" role="group" aria-label={t.nav.language}>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className="lang-btn"
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
        >
          {LANG_LABEL[option]}
        </button>
      ))}
    </div>
  )
}
