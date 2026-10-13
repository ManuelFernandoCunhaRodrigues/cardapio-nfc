import { useId } from 'react';

// Ilustração da casa para quando ainda não há foto: a coxinha do logo, como nas telas aprovadas.
export function CoxinhaArt({ className = '', variant = 'single' }: Readonly<{ className?: string; variant?: 'single' | 'banner' }>) {
  const gradient = useId();
  const drop = <>
    <path d="M50 8s30 38 30 56c0 16-13 26-30 26S20 80 20 64C20 46 50 8 50 8Z" fill={`url(#${gradient})`} stroke="#C4650F" strokeLinejoin="round" strokeWidth="3" />
    <path d="M36 62c0 10 5 16 13 18" fill="none" opacity=".85" stroke="#FDE0AE" strokeLinecap="round" strokeWidth="4" />
  </>;
  return <svg aria-hidden="true" className={className} viewBox="0 0 100 100">
    <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FBB751" /><stop offset="1" stopColor="#E7841C" /></linearGradient></defs>
    {variant === 'banner' ? <>
      <g fill="none" opacity=".35" stroke="#FAF7EF" strokeLinecap="round" strokeWidth="1.6"><path d="M38 14c-4 5 4 8 0 14" /><path d="M62 10c-4 5 4 8 0 14" /></g>
      <svg height="66" viewBox="0 0 100 100" width="66" x="34" y="26">{drop}</svg>
      <svg height="76" viewBox="0 0 100 100" width="76" x="2" y="22">{drop}</svg>
    </> : <>
      <ellipse cx="50" cy="92" fill="#17110D" opacity=".12" rx="28" ry="4" />
      {drop}
    </>}
  </svg>;
}
