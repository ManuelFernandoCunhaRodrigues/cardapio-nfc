'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { getSaoPauloWeekday } from '@/features/menu/rules/presentation';
import {
  getClientStoreStatus,
  type PublicStoreStatusSettings,
} from '@/features/store/rules/client-status';
import {
  getProductAvailabilityNotice,
  type ProductAvailabilityNotice,
} from '@/features/store/rules/product-availability';
import { getStoreStatusDetail, getStoreStatusLinkLabel } from '@/features/store/rules/status-text';

import { Icon, type IconName } from '@/features/menu/components/icons';

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
      aria-label={getStoreStatusLinkLabel(status.isOpen)}
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
  const { now, status } = useLiveStoreStatus(settings, initialNow);

  return (
    <section
      aria-labelledby="status-da-loja"
      className={`mt-4 rounded-card p-4 ${status.isOpen ? 'bg-green-soft' : 'bg-danger-soft'}`}
    >
      <h2 className="lbl text-muted" id="status-da-loja">
        Status da loja
      </h2>
      <p
        className={`disp mt-1 flex items-center gap-2 text-2xl font-bold ${status.isOpen ? 'text-green' : 'text-danger'}`}
      >
        <span aria-hidden="true" className="size-2.5 rounded-full bg-current" />
        {status.isOpen ? 'Aberta' : 'Fechada'}
      </p>
      <p className="mt-0.5 text-sm font-bold text-body">{getStoreStatusDetail(status, now)}</p>
      {notice ? (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-body">
          <Icon height={16} name="info" width={16} />
          {notice}
        </p>
      ) : null}
    </section>
  );
}

const availabilityStyle: Record<
  ProductAvailabilityNotice['tone'],
  { className: string; icon: IconName }
> = {
  available: { className: 'bg-green-soft text-green', icon: 'check' },
  'store-closed': { className: 'bg-amber-soft text-ink', icon: 'clock' },
  unavailable: { className: 'bg-danger-soft text-danger', icon: 'alert' },
};

/** Fica no navegador, como o status do topo, para a página do produto continuar estática. */
export function ProductAvailability({
  isAvailable,
  settings,
  initialNow,
}: Readonly<{ isAvailable: boolean; settings: PublicStoreStatusSettings; initialNow: string }>) {
  const { now, status } = useLiveStoreStatus(settings, initialNow);
  const notice = getProductAvailabilityNotice(isAvailable, status, now);
  const style = availabilityStyle[notice.tone];
  return (
    <p
      className={`mt-4 flex items-start gap-2 rounded-product px-4 py-3 text-sm font-bold ${style.className}`}
    >
      <Icon className="shrink-0" height={18} name={style.icon} width={18} />
      <span>{notice.text}</span>
    </p>
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
