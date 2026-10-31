'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { useExitPresence } from '@/components/motion/exit-presence';

type NoticeKind = 'success' | 'error' | 'info';

const noticeColors: Record<NoticeKind, string> = {
  error: 'border-danger/25 bg-danger-soft text-danger',
  success: 'border-green/20 bg-green-soft text-green',
  info: 'border-border bg-surface-inner text-body',
};

// `initial={false}`: o aviso que já vem no HTML do servidor aparece pronto, sem nascer invisível;
// só os que surgem depois (resultado de uma ação) entram animados. `mode="wait"` evita dois
// avisos empilhados enquanto um troca pelo outro.
export function AdminNotice({
  message,
  kind = 'success',
  className = '',
}: Readonly<{ message?: string; kind?: NoticeKind; className?: string }>) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {message ? (
        <NoticeMessage className={className} key={`${kind}:${message}`} kind={kind}>
          {message}
        </NoticeMessage>
      ) : null}
    </AnimatePresence>
  );
}

function NoticeMessage({
  kind,
  className,
  children,
}: Readonly<{ kind: NoticeKind; className: string; children: string }>) {
  const { exitingAttributes } = useExitPresence();
  return (
    <m.p
      {...exitingAttributes}
      animate={{ opacity: 1, y: 0 }}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${noticeColors[kind]} ${className}`}
      exit={{ opacity: 0, y: -4 }}
      initial={{ opacity: 0, y: -4 }}
      role={kind === 'error' ? 'alert' : 'status'}
      transition={{ duration: 0.16 }}
    >
      {children}
    </m.p>
  );
}
