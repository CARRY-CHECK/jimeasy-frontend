import { LogoIcon, ResetIcon } from './icons'

export default function Header({ disabled, onReset }) {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-mark"><LogoIcon /></span>
        <span className="logo-text">JimEasy</span>
      </div>
      <button className="btn-reset" disabled={disabled} onClick={onReset}>
        <ResetIcon />새로 확인하기
      </button>
    </header>
  )
}
