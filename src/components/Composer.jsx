import { SendIcon } from './icons'

// disabled: 입력칸까지 막음(서버 준비·응답 대기). locked: 입력은 되지만 보내기만 막음(챗봇이 말하는 중).
export default function Composer({ value, placeholder, disabled, locked, onChange, onSend }) {
  const submit = (e) => {
    e.preventDefault()
    const text = value.trim()
    if (text && !locked) onSend(text)
  }
  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor="q" className="sr">질문 입력</label>
      <input
        id="q" type="text" autoComplete="off" value={value} placeholder={placeholder}
        disabled={disabled} onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" aria-label="보내기" disabled={locked || !value.trim()}>
        <SendIcon />
      </button>
    </form>
  )
}
