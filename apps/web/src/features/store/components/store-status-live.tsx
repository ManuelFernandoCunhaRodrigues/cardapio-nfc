'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { formatStoreStatusTime, getSaoPauloWeekday } from '@/features/menu/rules/presentation';
import {
  getClientStoreStatus,
  type PublicStoreStatusSettings,
} from '@/features/store/rules/client-status';

import { Icon } from '@/features/menu/components/icons';

const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function useLiveStoreStatus(settings: PublicStoreStatusSettings, initialNow: string) {
  const [now, setNow] = useState(() => new Date(initialNow));

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return { now, status: getClientStoreStatus(settings, now) };
}

export function StoreHeaderStatus({
  settings,
  initialNow,
}: Readonly<{ settings: PublicStoreStatusSettings; initialNow: string }>) {
  const { status } = useLiveStoreStatus(settings, initialNow);
  return (
    <Link
      className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-3 font-[family-name:var(--font-poppins)] text-xs font-semibold focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40 ${status.isOpen ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`}
      href="/info"
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {status.isOpen ? 'Aberta' : 'Fechada'}
    </Link>
  );
}

export function StoreInfoStatus({
  settings,
  initialNow,
  notice,
}: Readonly<{ settings: PublicStoreStatusSettings; initialNow: string; notice: string | null }>) {
  const { status } = useLiveStoreStatus(settings, initialNow);
  const detail =
    status.isOpen && status.closesAt
      ? `Fecha às ${formatStoreStatusTime(status.closesAt)}`
      : !status.isOpen && status.opensNext
        ? `Abre ${formatStoreStatusTime(status.opensNext, true)}`
        : status.isOpen
          ? 'Atendendo agora'
          : 'Fechada no momento';

  return (
    <section
      className={`mt-4 rounded-card p-4 ${status.isOpen ? 'bg-green-soft' : 'bg-danger-soft'}`}
    >
      <p className="lbl text-muted">Status da loja</p>
      <h2
        className={`disp mt-1 flex items-center gap-2 text-2xl font-bold ${status.isOpen ? 'text-green' : 'text-danger'}`}
      >
        <span aria-hidden="true" className="size-2.5 rounded-full bg-current" />
        {status.isOpen ? 'Aberta' : 'Fechada'}
      </h2>
      <p className="mt-0.5 text-sm font-bold text-body">{detail}</p>
      {notice ? (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-body">
          <Icon height={16} name="info" width={16} />
          {notice}
        </p>
      ) : null}
    </section>
  );
}

export function StoreOpeningHours({
  settings,
  initialNow,
}: Readonly<{ settings: PublicStoreStatusSettings; initialNow: string }>) {
  const { now } = useLiveStoreStatus(settings, initialNow);
  const today = getSaoPauloWeekday(now);
  const hours = [...settings.opening_hours].sort((a, b) => a.day - b.day);

  return (
    <dl className="mt-2 overflow-hidden rounded-card bg-white shadow-card">
      {hours.map((hour, index) => (
        <div
          className={`flex justify-between px-4 py-2.5 text-sm ${hour.day === today ? 'bg-peach font-bold text-ink' : 'text-body'} ${index < hours.length - 1 ? 'border-b border-border/70' : ''}`}
          key={hour.day}
        >
          <dt>
            {weekdays[hour.day]}
            {hour.day === today ? ' · hoje' : ''}
          </dt>
          <dd>{hour.closed ? 'Fechado' : `${hour.open} às ${hour.close}`}</dd>
        </div>
      ))}
    </dl>
  );
}
