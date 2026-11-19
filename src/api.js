// 짐이지(JimEasy) 백엔드(/chat, /chat/reset) 호출. VITE_MOCK=1 이면 mock.js로 대신 응답한다.
import * as mock from './mock'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const MOCK = import.meta.env.VITE_MOCK === '1'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function post(path, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('서버에 연결하지 못했어요.', 'NETWORK')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : '자료를 찾다가 연결이 끊겼어요.'
    throw new ApiError(detail, res.status)
  }
  return data
}

export function sendMessage(sessionId, message) {
  const body = { session_id: sessionId, message }
  return MOCK ? mock.chat(body) : post('/chat', body)
}

// 추가 질문 선택지 클릭. card 자리에는 질문 순번, question_id에는 clarification.id를 보낸다.
export function sendChoice(sessionId, clarificationId, question, option) {
  const body = { session_id: sessionId, choice: { card: question, option, question_id: clarificationId } }
  return MOCK ? mock.chat(body) : post('/chat', body)
}

export function resetSession(sessionId) {
  const body = { session_id: sessionId }
  return MOCK ? mock.reset(body) : post('/chat/reset', body)
}

// 서버가 떠 있는지 확인. 처음 켤 때 모델 로딩으로 최대 1분 걸린다.
export async function ping() {
  if (MOCK) return true
  try {
    return (await fetch(BASE + '/openapi.json')).ok
  } catch {
    return false
  }
}
