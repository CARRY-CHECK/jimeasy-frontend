// 서버 없이 화면을 확인하기 위한 예시 응답. 백엔드(tools 엔진) ChatResponse와 같은 모양이다.
// 출처 기관과 문서는 모두 가상이며, 판정 문구도 화면 확인용 예시라 실제 규정이 아니다.
// 흐름: 첫 질문 → 추가 질문(clarification) → 답하면 카드. "실패"는 오류, "확인 불가"는 판정 불가 응답.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const fail = (message, code) => Object.assign(new Error(message), { code })

const emptyConditions = () => ({
  departure: { place: null, airline: null },
  arrival: { place: null, airline: null },
  travel_date: null,
  baggage_type: null,
})

const QUESTIONS = [
  { field: 'arrival.place', question: '어느 나라로 가세요?', options: ['일본', '대만', '미국', '잘 모르겠어요'] },
  { field: 'item_2.details', question: '가위 날 길이가 어느 정도인가요?', options: ['6cm 이하', '6cm 초과', '잘 모르겠어요'] },
]

const SOURCES = {
  battery: [
    { chunk_id: 'm1', source_type: 'airline', org_name: '샘플에어(가상)', title: '수하물 안내(예시)', section_path: '보조배터리', collected_at: '2026-10-23', source_url: '#' },
    { chunk_id: 'm2', source_type: 'press', org_name: '샘플 항공보안당국(가상)', title: '보조배터리 운송 기준 안내(예시)', effective_date: '2026-04-20', source_url: '#' },
  ],
  scissors: [
    { chunk_id: 'm3', source_type: 'admin_rule', org_name: '샘플 항공보안당국(가상)', title: '기내 반입 제한 물품 기준(예시)', section_path: '가위', effective_date: '2026-01-01', source_url: '#' },
  ],
}

const ITEMS = ['보조배터리', '가위', '여분 옷']

const finalCards = () => [
  {
    id: 0, name: '보조배터리',
    carry_on: { status: '조건부 가능', condition: '100Wh 이하 최대 2개' },
    checked: { status: '불가', condition: '개수와 관계없이 금지' },
    notes: '20000mAh는 약 74Wh로 100Wh 이하 조건을 충족해요.\n기내에서 사용·충전은 금지예요.\n합선 방지 조치가 필요해요.',
    follow_up: null, evidence: SOURCES.battery,
  },
  {
    id: 1, name: '가위',
    carry_on: { status: '조건부 가능', condition: '날 6cm 이하' },
    checked: { status: '가능', condition: '날 부분 감싸서 포장' },
    notes: '날 길이가 6cm 이하일 때만 기내에 가져갈 수 있어요.\n6cm를 넘으면 위탁으로 보내 주세요.',
    follow_up: null, evidence: SOURCES.scissors,
  },
  {
    id: 2, name: '여분 옷',
    carry_on: { status: '가능', condition: null }, checked: { status: '가능', condition: null },
    notes: null, follow_up: null, evidence: [],
  },
]

let state = { conditions: emptyConditions(), pending: null, answered: false, batch: 0, blade: null }

function ask(questions) {
  const id = `mock-${++state.batch}`
  state.pending = { id, questions: questions.map((q, index) => ({ ...q, id: `${id}_${index}` })) }
  return { message: '판정에 필요한 정보를 알려 주세요.', clarification: state.pending }
}

// 가위 날 길이 답에 따라 기내 판정과 요약이 달라진다.
const BLADE = {
  le6: { carry: { status: '가능', condition: '날 6cm 이하라 들고 탈 수 있어요' }, summary: '가위는 날이 6cm 이하라 기내에 가져갈 수 있어요' },
  gt6: { carry: { status: '불가', condition: '날 6cm 초과는 기내 금지' }, summary: '가위는 날이 6cm를 넘어 위탁으로 보내야 해요' },
  unknown: { carry: { status: '조건부 가능', condition: '날 6cm 이하' }, summary: '가위는 날 길이를 확인해 주세요' },
}

function bladeFrom(text) {
  const t = text.normalize('NFKC').replace(/\s/g, '')
  if (t.includes('초과') || t.includes('넘')) return 'gt6'
  if (t.includes('이하') || t.includes('미만')) return 'le6'
  return 'unknown'
}

function finish() {
  const blade = BLADE[state.blade ?? 'unknown']
  state = { ...state, pending: null, answered: true }
  state.conditions = { ...state.conditions, arrival: { place: state.conditions.arrival.place ?? '대만', airline: null } }
  const cards = finalCards()
  cards[1] = { ...cards[1], carry_on: blade.carry }
  return {
    summary: `보조배터리는 기내에만 가져갈 수 있고, ${blade.summary}.`,
    cards, suggested_next: '액체 화장품 기내에 가져가도 돼?',
  }
}

function unresolved() {
  const message = '추가 정보를 확인하지 못해 판정을 확정할 수 없습니다. 물품 속성과 여행 조건을 확인한 뒤 다시 질문해 주세요.'
  state.pending = null
  return {
    message,
    cards: ITEMS.map((name, id) => ({
      id, name, carry_on: { status: '확인 필요' }, checked: { status: '확인 필요' },
      notes: message, follow_up: null, evidence: [],
    })),
  }
}

export async function chat({ session_id, message, choice }) {
  await wait(1500)
  let body
  if (choice) {
    if (!state.pending || choice.question_id !== state.pending.id) {
      throw fail('선택지가 현재 대화와 맞지 않습니다. 화면을 새로 고쳐 주세요.', 400)
    }
    const row = state.pending.questions[choice.card]
    const label = row.options[choice.option]
    if (row.field === 'arrival.place' && label !== '잘 모르겠어요') {
      state.conditions = { ...state.conditions, arrival: { place: label, airline: null } }
    }
    if (row.field === 'item_2.details') state.blade = bladeFrom(label)
    const rest = state.pending.questions.filter((_, index) => index !== choice.card)
    body = rest.length ? ask(rest) : finish()
  } else if (message.includes('실패')) {
    throw fail('대화 모델 연결에 실패했습니다.', 502)
  } else if (message.includes('확인 불가')) {
    body = unresolved()
  } else {
    state.conditions = { ...state.conditions, departure: { place: null, airline: '샘플에어' }, baggage_type: '기내' }
    // 질문 대기 중에 온 문장은 "질문 답" 줄들로 본다(프론트가 답을 모아 한 번에 보냄).
    if (state.pending) {
      state.blade = bladeFrom(message.split('\n').find((line) => line.includes('가위')) ?? message)
      const place = ['일본', '대만', '미국'].find((country) => message.includes(country))
      if (place) state.conditions = { ...state.conditions, arrival: { place, airline: null } }
    }
    body = state.pending || state.answered ? finish() : ask(QUESTIONS)
  }
  return { session_id: session_id ?? 'mock-session', conditions: state.conditions, cards: [], ...body }
}

export async function reset({ session_id }) {
  state = { conditions: emptyConditions(), pending: null, answered: false, batch: 0, blade: null }
  return { session_id, conditions: state.conditions }
}
