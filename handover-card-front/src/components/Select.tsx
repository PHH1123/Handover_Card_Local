import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '../i18n/LanguageContext'

export interface SelectOption {
  value: string
  label: string
  /** 라벨 옆 작은 표식 (팀장 등) */
  badge?: string
  /** 라벨 아래 작게 붙는 보조 정보 (이메일 등) */
  hint?: string
  /** 이 항목 위에 구분선을 둔다 */
  divider?: boolean
}

/**
 * 목록을 직접 그리는 드롭다운.
 *
 * 네이티브 `<select>` 의 펼침 목록은 브라우저가 아니라 OS 가 그려서 CSS 가 닿지 않는다.
 * 글꼴도 색도 여백도 우리 것이 아니고 OS 마다 달라 데모 화면이 예측되지 않으므로,
 * 목록만 직접 그리고 키보드 조작과 ARIA 는 네이티브와 같게 맞췄다.
 * 포커스는 계속 트리거 버튼에 두고 aria-activedescendant 로 현재 항목을 가리킨다.
 */
export function Select({
  id,
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  id?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [dropUp, setDropUp] = useState(false)

  const shellRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  function openList() {
    if (disabled) return
    // 펼치면 지금 고른 항목부터 짚는다. 없으면 맨 위.
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function commit(index: number) {
    const option = options[index]
    if (!option) return
    if (option.value !== value) onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // 아래 공간이 모자라면 위로 펼친다. 화면 밖으로 나가면 고를 수가 없다.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const list = listRef.current
    if (!trigger || !list) return
    const below = window.innerHeight - trigger.getBoundingClientRect().bottom
    setDropUp(below < list.offsetHeight + 16)
  }, [open])

  // 목록이 길면 짚고 있는 항목이 보이는 자리로 따라와야 한다.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  // 바깥을 누르면 닫는다. click 이 아니라 pointerdown 이라야 누르는 순간 반응한다.
  useEffect(() => {
    if (!open) return
    const handle = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(active)
        break
      case 'Tab':
        // 다음 칸으로 넘어가는 것은 막지 않고 목록만 접는다.
        setOpen(false)
        break
    }
  }

  return (
    <div className="select-shell" ref={shellRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`select select-trigger${open ? ' select-trigger--open' : ''}`}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        {selected ? (
          <>
            <span className="select-trigger-label">{selected.label}</span>
            {selected.badge && <span className="select-badge">{selected.badge}</span>}
            {selected.hint && <span className="select-trigger-hint">{selected.hint}</span>}
          </>
        ) : (
          <span className="select-trigger-empty">{placeholder ?? t.select.placeholder}</span>
        )}
      </button>

      {open && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          className={`select-list${dropUp ? ' select-list--up' : ''}`}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active}
              className={`select-option${option.divider ? ' select-option--parted' : ''}`}
              onMouseMove={() => setActive(index)}
              onClick={() => commit(index)}
            >
              <span className="select-option-head">
                <span className="select-option-label">{option.label}</span>
                {option.badge && <span className="select-badge">{option.badge}</span>}
              </span>
              {option.hint && <span className="select-option-hint">{option.hint}</span>}

              {option.value === value && (
                <svg className="select-check" viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M2 7.5 5.5 11 12 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
