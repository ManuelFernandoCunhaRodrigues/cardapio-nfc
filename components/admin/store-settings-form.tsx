'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { initialStoreSettingsActionState } from '@/app/admin/loja/action-state';
import { updateStoreSettings } from '@/app/admin/loja/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { StoreSettings } from '@/lib/validators/store-settings';

const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function SaveButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? 'Salvando…' : 'Salvar dados da loja'}</Button>;
}

function defaultHours() {
  return Array.from({ length: 7 }, (_, day) => ({ day, closed: day === 0, open: '08:00', close: '18:00' }));
}

export function StoreSettingsForm({ settings }: { settings: StoreSettings | null }) {
  const [state, formAction] = useActionState(updateStoreSettings, initialStoreSettingsActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const hours = settings?.opening_hours ?? defaultHours();
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => {
    if (state.status === 'error') formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6" noValidate>
      <Card>
        <h2 className="disp text-xl font-bold text-ink">Informações da loja</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Input defaultValue={settings?.name ?? 'Salgaê Lanchonete'} error={errorFor('name')} label="Nome da loja" name="name" required />
          <Input defaultValue={settings?.tagline ?? ''} error={errorFor('tagline')} label="Frase curta" name="tagline" placeholder="Salgados quentes" />
          <Input className="sm:col-span-2" defaultValue={settings?.address ?? ''} error={errorFor('address')} label="Endereço" name="address" />
          <Input className="sm:col-span-2" defaultValue={settings?.maps_url ?? ''} error={errorFor('maps_url')} label="Link do mapa" name="maps_url" type="url" inputMode="url" placeholder="https://…" />
          <Input defaultValue={settings?.phone ?? ''} error={errorFor('phone')} label="Telefone" name="phone" inputMode="tel" placeholder="5585…" />
          <Input defaultValue={settings?.whatsapp ?? ''} error={errorFor('whatsapp')} label="WhatsApp" name="whatsapp" inputMode="tel" placeholder="5585…" />
          <Input defaultValue={settings?.instagram ?? ''} error={errorFor('instagram')} label="Instagram (sem @)" name="instagram" placeholder="salgaelanchonete" />
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-bold text-ink" htmlFor="notice">Aviso curto</label>
            <textarea className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink placeholder:text-placeholder focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" defaultValue={settings?.notice ?? ''} id="notice" name="notice" maxLength={140} aria-invalid={Boolean(errorFor('notice'))} aria-describedby={errorFor('notice') ? 'notice-error' : undefined} placeholder="Ex.: Hoje fechamos às 15h" />
            {errorFor('notice') ? <p className="text-sm text-danger" id="notice-error">{errorFor('notice')}</p> : null}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="disp text-xl font-bold text-ink">Status e horários</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Os horários são interpretados no fuso de São Paulo.</p>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-bold text-ink" htmlFor="status_override">Status temporário</label>
          <select className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10 sm:max-w-md" defaultValue={settings?.status_override ?? 'auto'} id="status_override" name="status_override">
            <option value="auto">Seguir horários cadastrados</option><option value="open">Manter aberta manualmente</option><option value="closed">Manter fechada manualmente</option>
          </select>
        </div>
        {errorFor('opening_hours') ? <p className="mt-4 text-sm text-danger" role="alert">{errorFor('opening_hours')}</p> : null}
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><thead className="text-muted"><tr><th className="pb-2 pr-4 font-bold">Dia</th><th className="pb-2 pr-4 font-bold">Fechado</th><th className="pb-2 pr-4 font-bold">Abre</th><th className="pb-2 font-bold">Fecha</th></tr></thead><tbody>
          {DAYS.map((dayName, day) => {
            const hour = hours.find((item) => item.day === day) ?? defaultHours()[day];
            const hourError = errorFor(`opening_hours.${day}.close`);
            return <tr className="border-t border-border" key={day}><th className="py-3 pr-4 font-bold text-ink" scope="row">{dayName}</th><td className="py-3 pr-4"><label className="inline-flex min-h-11 items-center gap-2 text-ink"><input defaultChecked={hour.closed} name={`closed-${day}`} type="checkbox" /> Fechado</label></td><td className="py-3 pr-4"><label className="sr-only" htmlFor={`open-${day}`}>Abertura de {dayName}</label><input className="min-h-11 rounded-xl border border-border bg-surface-inner px-3 text-ink" defaultValue={hour.open} id={`open-${day}`} name={`open-${day}`} type="time" required /></td><td className="py-3"><label className="sr-only" htmlFor={`close-${day}`}>Fechamento de {dayName}</label><input className="min-h-11 rounded-xl border border-border bg-surface-inner px-3 text-ink" defaultValue={hour.close} id={`close-${day}`} name={`close-${day}`} type="time" required aria-invalid={Boolean(hourError)} aria-describedby={hourError ? `close-${day}-error` : undefined} />{hourError ? <p className="mt-1 text-sm text-danger" id={`close-${day}-error`}>{hourError}</p> : null}</td></tr>;
          })}
        </tbody></table></div>
      </Card>

      {state.message ? <p className={state.status === 'success' ? 'rounded-xl border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive' : 'rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger'} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p> : null}
      <SaveButton />
    </form>
  );
}
