// 여행 조건 띠. 칩을 누르면 수정 칸이 열리고, 고친 조건은 문장으로 만들어 /chat에 보낸다.
// 백엔드 대화 모델이 문장에서 조건 변경(해제 포함)을 읽어 다시 판정한다.
import { useState } from 'react'

const BAGS = ['기내', '위탁', '둘 다']

function fromTrip(trip) {
  return {
    from: trip.departure.place ?? '',
    to: trip.arrival.place ?? '',
    airline: trip.departure.airline ?? trip.arrival.airline ?? '',
    date: trip.travel_date ?? '',
    bag: trip.baggage_type,
  }
}

const LABELS = { from: '출발지', to: '도착지', airline: '항공사', date: '날짜' }

// 바뀐 칸만 문장으로 만든다. 지운 칸은 "미정"으로 보내 백엔드가 조건을 해제하게 한다.
function toMessage(form, before) {
  const parts = Object.entries(LABELS)
    .filter(([key]) => form[key].trim() !== before[key])
    .map(([key, label]) => `${label} ${form[key].trim() || '미정'}`)
  if (form.bag !== before.bag) parts.push(form.bag === '둘 다' ? '기내와 위탁 둘 다' : `${form.bag} 수하물`)
  return parts.length ? `여행 조건을 바꿀게요: ${parts.join(', ')}. 다시 확인해 줘` : null
}

function Chip({ value, empty, onClick }) {
  return (
    <button className={value ? 'chip' : 'chip chip--empty'} onClick={onClick}>
      {value ?? empty}
    </button>
  )
}

export default function TripBar({ trip, disabled, onSubmit }) {
  const [form, setForm] = useState(null)
  const t = fromTrip(trip)
  const open = () => !disabled && setForm(fromTrip(trip))
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })

  const submit = () => {
    const message = toMessage(form, t)
    setForm(null)
    if (message) onSubmit(message)
  }

  return (
    <div className="trip" aria-label="여행 조건">
      <div className="chips">
        <Chip value={t.from && `출발 ${t.from}`} empty="출발지 미입력" onClick={open} />
        <Chip value={t.to && `도착 ${t.to}`} empty="도착지 미입력" onClick={open} />
        <Chip value={t.airline || null} empty="항공사 미입력" onClick={open} />
        <Chip value={t.date || null} empty="날짜 미입력" onClick={open} />
        <Chip value={t.bag} empty="기내/위탁 미입력" onClick={open} />
      </div>
      {form && (
        <div className="trip-edit">
          <span className="trip-edit-title">여행 조건 고치기</span>
          <div className="trip-fields">
            <label className="field">출발지<input placeholder="예: 인천" {...field('from')} /></label>
            <label className="field">도착지<input placeholder="예: 대만" {...field('to')} /></label>
            <label className="field">항공사<input placeholder="예: 아시아나항공" {...field('airline')} /></label>
            <label className="field">날짜<input placeholder="예: 11월 3일" {...field('date')} /></label>
          </div>
          <div className="seg seg--3" role="group" aria-label="물어본 짐">
            {BAGS.map((bag) => (
              <button key={bag} aria-pressed={form.bag === bag} onClick={() => setForm({ ...form, bag })}>
                {bag}
              </button>
            ))}
          </div>
          <div className="trip-actions">
            <button className="btn-secondary" onClick={() => setForm(null)}>취소</button>
            <button className="btn-primary" onClick={submit}>이 조건으로 다시 확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
