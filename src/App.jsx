// JimEasy 채팅 화면. phase로 서버 준비 중 / 기다리는 중 / 입력 중(하나씩 보여주는 중) / 대기 / 오류를 전환한다.
// 응답은 한 번에 오지만 말풍선·카드·추가 질문을 단계(step)로 쪼개 채팅처럼 하나씩 보여준다.
import { useEffect, useRef, useState } from 'react'
import { ping, resetSession, sendChoice, sendMessage } from './api'
import Header from './components/Header'
import TripBar from './components/TripBar'
import Composer from './components/Composer'
import { FreeItemsCard, ItemCard, isFree } from './components/ItemCard'
import { BootingBubble, ErrorBubble, TypingBubble, WaitingBubble } from './components/Bubbles'

const GREETING = [
  '안녕하세요!',
  '가져갈 물건이랑 여행 정보를 편하게 적어주세요.',
  '반입 가능 여부부터 챙기는 방법, 주의할 점까지 공식 자료로 확인해 드릴게요.',
]
const BOOT_SECONDS = 60
const CARD_DELAY = 700

let lastId = 0
const msg = (kind, data) => ({ id: ++lastId, kind, ...data })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 화면에 하나씩 올릴 단계. delay 뒤에 apply(이전 메시지 → 다음 메시지)를 적용한다.
const typingDelay = (text) => 350 + Math.min(text.length * 15, 900)
const append = (delay, message) => ({ delay, apply: (prev) => [...prev, message] })
const botStep = (text) => append(typingDelay(text), msg('bot', { text }))

const askStep = (clarificationId, index, question) =>
  append(typingDelay(question.question), msg('ask', { clarificationId, index, question: question.question, options: question.options }))

// 카드 묶음에서 화면에 하나씩 보일 칸 수: 일반 카드 각각 + 제한 없는 물품 묶음 1칸
const cardSlots = (cards) => cards.filter((c) => !isFree(c)).length + (cards.some(isFree) ? 1 : 0)

// 백엔드는 추가 질문을 최대 3개 묶어 보내고 한 번에 답을 받는다.
// 화면에서는 하나씩 묻고, 답을 다 모으면 백엔드 선택지 처리와 같은 "질문 답" 형식의 줄로 이어 보낸다.
const joinAnswers = (queue, answers) => queue.questions.map((q, i) => `${q.question} ${answers[i]}`).join('\n')

// 순서: 요약(없으면 안내 문장) → 카드 하나씩 → 남은 안내 문장 → 첫 추가 질문
// 추가 질문이 있을 때의 안내 문장은 매번 같은 고정 문구라 생략한다.
function planSteps(res) {
  const steps = []
  const clarification = res.clarification
  const lead = res.summary ?? (clarification ? null : res.message)
  if (lead) steps.push(botStep(lead))
  if (res.cards.length) {
    const group = msg('cards', { cards: res.cards, shown: 1 })
    steps.push(append(CARD_DELAY, group))
    for (let shown = 2; shown <= cardSlots(res.cards); shown++) {
      steps.push({ delay: CARD_DELAY, apply: (prev) => prev.map((m) => (m.id === group.id ? { ...m, shown } : m)) })
    }
  }
  if (res.summary && res.message) steps.push(botStep(res.message))
  if (clarification?.questions.length) steps.push(askStep(clarification.id, 0, clarification.questions[0]))
  return steps
}

export default function App() {
  const [phase, setPhase] = useState('booting') // booting | loading | typing | ready | error
  const [bootElapsed, setBootElapsed] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [trip, setTrip] = useState(null)
  const [messages, setMessages] = useState([])
  const [queue, setQueue] = useState(null) // 답을 모으는 중인 추가 질문 { id, questions, answers }
  const [draft, setDraft] = useState('')
  const [suggested, setSuggested] = useState(null)
  const [failure, setFailure] = useState(null)
  const epoch = useRef(0) // 새로 확인하기 이후 도착한 이전 응답·단계를 버리기 위한 번호
  const chatRef = useRef(null)

  useEffect(() => {
    let alive = true
    const started = Date.now()
    const timer = setInterval(() => setBootElapsed((Date.now() - started) / 1000), 500)
    ;(async () => {
      while (alive && !(await ping())) await wait(2000)
      clearInterval(timer)
      if (alive) play(GREETING.map(botStep))
    })()
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, phase])

  async function play(steps) {
    const current = epoch.current
    setPhase('typing')
    for (const { delay, apply } of steps) {
      await wait(delay)
      if (current !== epoch.current) return
      setMessages(apply)
    }
    setPhase('ready')
  }

  async function run(request, ui) {
    const current = epoch.current
    setPhase('loading')
    setFailure(null)
    try {
      const res = await request()
      if (current !== epoch.current) return
      setSessionId(res.session_id)
      setTrip(res.conditions)
      setQueue(res.clarification ? { ...res.clarification, answers: [] } : null)
      setSuggested(res.suggested_next ?? null)
      await play(planSteps(res))
    } catch (error) {
      if (current !== epoch.current) return
      setFailure({ request, ui, message: error.message, code: error.code ?? 'UNKNOWN' })
      setPhase('error')
    }
  }

  function addUser(text) {
    const user = msg('user', { text })
    setMessages((prev) => [...prev, user])
    setDraft('')
    return user
  }

  function ask(text) {
    const user = addUser(text)
    run(() => sendMessage(sessionId, text), { userMsgId: user.id, text })
  }

  // 추가 질문에 대한 답(선택지 번호 option, 직접 입력이면 null). 남은 질문이 있으면 서버에 가지 않고 다음 질문을 묻는다.
  function answer(text, option) {
    const user = addUser(text)
    const answers = [...queue.answers, text]
    setQueue({ ...queue, answers })
    const next = queue.questions[answers.length]
    if (next) {
      play([askStep(queue.id, answers.length, next)])
      return
    }
    // 질문이 하나뿐이고 선택지를 눌렀다면 백엔드 선택지 경로(모름 처리 포함)를 그대로 쓴다.
    const request = queue.questions.length === 1 && option !== null
      ? () => sendChoice(sessionId, queue.id, 0, option)
      : () => sendMessage(sessionId, joinAnswers(queue, answers))
    run(request, { userMsgId: user.id, text, answer: true })
  }

  const send = (text) => (queue && queue.answers.length < queue.questions.length ? answer(text, null) : ask(text))

  function editFailed() {
    setMessages((prev) => prev.filter((m) => m.id !== failure.ui.userMsgId))
    if (failure.ui.answer) setQueue((q) => ({ ...q, answers: q.answers.slice(0, -1) }))
    setDraft(failure.ui.text)
    setFailure(null)
    setPhase('ready')
  }

  function reset() {
    epoch.current += 1
    if (sessionId) resetSession(sessionId).catch(() => {})
    setSessionId(null)
    setTrip(null)
    setMessages([])
    setQueue(null)
    setDraft('')
    setSuggested(null)
    setFailure(null)
    play(GREETING.map(botStep))
  }

  const busy = phase === 'booting' || phase === 'loading' || phase === 'typing'
  const intro = !messages.some((m) => m.kind === 'user')
  const lastCardsId = messages.findLast((m) => m.kind === 'cards')?.id
  const placeholder = phase === 'booting' ? '준비가 끝나면 입력할 수 있어요'
    : intro ? '예: 가위 기내에 가져가도 돼?'
    : queue ? '위 질문에 답하거나 직접 적어주세요'
    : suggested ? `예: ${suggested}` : '이어서 물어보세요'

  function renderMessage(m) {
    if (m.kind === 'user') return <p key={m.id} className="bubble bubble--user">{m.text}</p>
    if (m.kind === 'bot') return <p key={m.id} className="bubble bubble--bot">{m.text}</p>
    if (m.kind === 'ask') {
      // 지금 답할 차례인 질문에만 선택지를 보여준다.
      const open = m.clarificationId === queue?.id && m.index === queue.answers.length
      return (
        <div key={m.id} className="ask">
          <p className="bubble bubble--bot">{m.question}</p>
          {open && (
            <div className="quick-replies">
              {m.options.map((option, index) => (
                <button key={option} className="option" disabled={phase !== 'ready'} onClick={() => answer(option, index)}>
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }
    const free = m.cards.filter(isFree)
    const slots = m.cards.filter((c) => !isFree(c)).map((card) => <ItemCard key={card.id} card={card} />)
    if (free.length) slots.push(<FreeItemsCard key="free" cards={free} />)
    return (
      <div key={m.id} className={m.id === lastCardsId ? 'cards' : 'cards cards--old'}>
        {slots.slice(0, m.shown)}
      </div>
    )
  }

  return (
    <div className="app">
      <Header disabled={phase === 'booting'} onReset={reset} />
      {trip && !intro && <TripBar trip={trip} disabled={busy} onSubmit={ask} />}

      <main ref={chatRef} className={intro ? 'chat chat--intro' : 'chat'}>
        {phase === 'booting' && <BootingBubble elapsed={bootElapsed} total={BOOT_SECONDS} />}
        {messages.map(renderMessage)}
        {phase === 'loading' && <WaitingBubble />}
        {phase === 'typing' && <TypingBubble />}
        {phase === 'error' && (
          <ErrorBubble
            message={failure.message} code={failure.code}
            onRetry={() => run(failure.request, failure.ui)} onEdit={editFailed}
          />
        )}
      </main>

      <Composer
        value={draft} placeholder={placeholder}
        disabled={phase === 'booting' || phase === 'loading'} locked={busy}
        onChange={setDraft} onSend={send}
      />
    </div>
  )
}
