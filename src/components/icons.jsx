// 디자인 시안의 선 아이콘(SVG). 물품 아이콘은 이름의 키워드로 고른다.
const line = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const LogoIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" strokeWidth="2" {...line} stroke="#FFFFFF">
    <rect x="3" y="8" width="18" height="12" rx="3" />
    <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M8.5 14l2.5 2.5 4.5-4.5" />
  </svg>
)

export const ResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...line}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
)

export const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.2" {...line}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

export const Triangle = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={open ? 'tri tri--open' : 'tri'}>
    <path d="M2 1l6 4-6 4z" fill="currentColor" />
  </svg>
)

const ITEM_PATHS = {
  battery: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M12.5 8.5L10.5 12h3l-2 3.5" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M8.2 15.8L19 3M15.8 15.8L5 3" />
    </>
  ),
  razor: (
    <>
      <rect x="7" y="9" width="10" height="13" rx="3" />
      <path d="M6 3h12v6H6z" />
      <path d="M9 6h6" />
    </>
  ),
  shirt: <path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z" />,
  necklace: (
    <>
      <path d="M5 3c0 7 3 10 7 10s7-3 7-10" />
      <path d="M12 13l-3 4 3 4 3-4z" />
    </>
  ),
  box: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 11h18M10 15h4" />
    </>
  ),
}

const KEYWORDS = [
  ['battery', ['배터리', '충전기']],
  ['scissors', ['가위', '칼', '커터']],
  ['razor', ['면도']],
  ['shirt', ['옷', '셔츠', '바지']],
  ['necklace', ['목걸이', '반지', '귀걸이', '팔찌']],
]

export function ItemIcon({ name, size = 20 }) {
  const kind = KEYWORDS.find(([, words]) => words.some((word) => name.includes(word)))?.[0] ?? 'box'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...line}>
      {ITEM_PATHS[kind]}
    </svg>
  )
}
