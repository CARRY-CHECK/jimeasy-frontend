// 챗봇 쪽 상태 말풍선: 서버 준비 중, 답변 기다리는 중, 오류.
import { useEffect, useState } from 'react'

// 기다린 시간(초)에 따라 점 옆에 붙는 안내. 처음엔 점만 보이고, 오래 걸릴 때만 글자가 붙는다.
const WAIT_LABELS = [
  [0, null],
  [8, '관련 규정을 찾고 있어요'],
  [20, '판정을 정리하고 있어요'],
  [45, '조금만 더 기다려 주세요'],
]

export function BootingBubble({ elapsed, total }) {
  const left = Math.max(0, Math.ceil(total - elapsed))
  return (
    <div role="status" className="bubble bubble--bot bubble--panel">
      <strong>서버를 준비하고 있어요</strong>
      <span className="muted">처음 켤 때는 최대 1분 정도 걸려요. 준비가 끝나면 바로 물어볼 수 있어요.</span>
      <div className="progress"><div style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} /></div>
      <span className="small">{left > 0 ? `약 ${left}초 남음` : '조금 더 걸리고 있어요'}</span>
    </div>
  )
}

// label이 없으면 점만 보여서 "입력 중"처럼 보인다.
export function TypingBubble({ label }) {
  return (
    <div role="status" aria-label={label ?? '입력 중'} className="bubble bubble--bot bubble--typing">
      {label && <span>{label}</span>}
      <span className="dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  )
}

export function WaitingBubble() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return <TypingBubble label={WAIT_LABELS.findLast(([at]) => seconds >= at)[1]} />
}

export function ErrorBubble({ message, code, onRetry, onEdit }) {
  return (
    <div role="alert" className="bubble bubble--bot bubble--panel bubble--error">
      <strong>답변을 받지 못했어요</strong>
      <span className="muted">{message} 질문은 그대로 남아 있으니 다시 시도해 주세요.</span>
      <div className="error-actions">
        <button className="btn-primary" onClick={onRetry}>다시 시도</button>
        <button className="btn-secondary" onClick={onEdit}>질문 고치기</button>
      </div>
      <span className="small">오류 코드 {code}</span>
    </div>
  )
}
