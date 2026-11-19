// 물품 판정 카드와 제한 없는 물품 묶음 카드. card는 백엔드 Card 스키마 그대로다.
import { useState } from 'react'
import { ItemIcon, Triangle } from './icons'

const BADGE = { 가능: 'ok', '조건부 가능': 'cond', 불가: 'no', '확인 필요': 'chk' }
const SOURCE_TYPE = { law: '법령', admin_rule: '고시', airline: '항공사', airport: '공항', government: '정부', press: '보도자료' }

export const isFree = (card) =>
  card.carry_on.status === '가능' && card.checked.status === '가능' &&
  !card.carry_on.condition && !card.checked.condition

const splitNotes = (notes) => (notes ?? '').split(/\n+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
const formatDate = (date) => date.replaceAll('-', '.')

function VerdictRow({ label, verdict }) {
  if (!verdict.status) return null
  return (
    <div className="verdict">
      <dt>{label}</dt>
      <dd className={`badge badge--${BADGE[verdict.status]}`}>{verdict.status}</dd>
      {verdict.condition && <dd className="verdict-cond">{verdict.condition}</dd>}
    </div>
  )
}

function Sources({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null
  return (
    <>
      <button className="sources-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Triangle open={open} />근거 {sources.length}개
      </button>
      {open && (
        <ol className="sources">
          {sources.map((s) => (
            <li key={s.chunk_id}>
              <div className="source-org">
                <span className="source-type">{SOURCE_TYPE[s.source_type] ?? s.source_type}</span>
                <span>{s.org_name}</span>
              </div>
              <span className="source-title">{[s.title, s.section_path].filter(Boolean).join(' · ')}</span>
              <div className="source-meta">
                <span>
                  {s.effective_date ? `시행 ${formatDate(s.effective_date)}`
                    : s.collected_at ? `수집 ${formatDate(s.collected_at)}` : ''}
                </span>
                {s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer">원문 보기</a>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

// 추가로 필요한 정보는 카드가 아니라 대화(clarification)로 묻는다.
export function ItemCard({ card }) {
  const notes = splitNotes(card.notes)
  return (
    <article className="card">
      <div className="card-head">
        <ItemIcon name={card.name} />
        <h3>{card.name}</h3>
      </div>
      <dl className="verdicts">
        <VerdictRow label="기내" verdict={card.carry_on} />
        <VerdictRow label="위탁" verdict={card.checked} />
      </dl>
      {notes.length > 0 && (
        <div className="card-section">
          <span className="card-label">유의사항</span>
          <ul className="notes">{notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </div>
      )}
      <Sources sources={card.evidence} />
    </article>
  )
}

export function FreeItemsCard({ cards }) {
  const sources = [...new Map(cards.flatMap((c) => c.evidence).map((s) => [s.chunk_id, s])).values()]
  return (
    <article className="card">
      <div className="card-head card-head--free">
        <h3>제한 없는 물품</h3>
        <span className="badge badge--ok">기내·위탁 모두 가능</span>
      </div>
      <ul className="free-list">
        {cards.map((card) => (
          <li key={card.id}>
            <ItemIcon name={card.name} size={18} />
            <span className="free-name">{card.name}</span>
            <span className="free-tag">제한 없음</span>
          </li>
        ))}
      </ul>
      <Sources sources={sources} />
    </article>
  )
}
