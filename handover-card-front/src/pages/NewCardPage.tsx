import { useNavigate } from 'react-router-dom'
import { NewCardForm } from '../components/NewCardForm'
import { useT } from '../i18n/LanguageContext'

/**
 * 인계 남기기 전용 화면.
 *
 * 같은 폼이 카드 목록 아래에도 놓여 있어서 평소에는 이 화면까지 오지 않는다.
 * 헤더의 「새 인계 남기기」 버튼과 예전 주소를 살려 두려고 남겨 둔 경로다.
 */
export function NewCardPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{t.cards.composeTitle}</h1>
        <p className="page-subtitle">{t.cards.composeSubtitle}</p>
      </div>

      <NewCardForm onCancel={() => navigate('/')} />
    </>
  )
}
