'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { initialStoreSettingsActionState } from '@/features/store/server/action-state';
import { updateStoreSettings } from '@/features/store/server/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { copyOpeningHourToEveryDay, type OpeningHourInput } from '@/features/admin/rules/panel';
import { fieldDefaults } from '@/features/admin/rules/submitted-values';
import type { StoreSettings } from '@salgae/core/schemas/store-settings';

import { useFocusFirstInvalid } from '@/features/admin/client/use-focus-first-invalid';
import { useLeaveGuard } from '@/features/admin/client/use-leave-guard';
import { AdminNotice } from '@/features/admin/components/admin-notice';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full lg:w-auto" disabled={pending} type="submit">
      {pending ? 'Salvando…' : 'Salvar dados da loja'}
    </Button>
  );
}
export function StoreSettingsForm({ settings }: Readonly<{ settings: StoreSettings }>) {
  const [state, formAction] = useActionState(updateStoreSettings, initialStoreSettingsActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [hours, setHours] = useState<OpeningHourInput[]>(settings.opening_hours);
  const [copySource, setCopySource] = useState(1);
  const [dirty, setDirty] = useState(false);
  useLeaveGuard(dirty || state.status === 'error');
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const defaults = fieldDefaults(state.values);
  useFocusFirstInvalid(formRef, state);
  const updateHour = (day: number, values: Partial<OpeningHourInput>) =>
    setHours((current) =>
      current.map((hour) => (hour.day === day ? { ...hour, ...values } : hour)),
    );

  return (
    <form
      action={formAction}
      className="space-y-4 pb-28 lg:pb-0"
      noValidate
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
      ref={formRef}
    >
      <section className="rounded-card bg-white p-4 shadow-card lg:p-5">
        <h2 className="disp text-lg font-semibold text-ink">Informações da loja</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            defaultValue={defaults.text('name', settings.name)}
            error={errorFor('name')}
            label="Nome da loja"
            name="name"
            required
          />
          <Input
            defaultValue={defaults.text('tagline', settings.tagline ?? '')}
            error={errorFor('tagline')}
            label="Frase curta"
            name="tagline"
            placeholder="Salgados quentes"
          />
          <Input
            className="sm:col-span-2"
            defaultValue={defaults.text('address', settings.address ?? '')}
            error={errorFor('address')}
            label="Endereço"
            name="address"
          />
          <Input
            className="sm:col-span-2"
            defaultValue={defaults.text('maps_url', settings.maps_url ?? '')}
            error={errorFor('maps_url')}
            label="Link do mapa"
            name="maps_url"
            placeholder="https://…"
            type="url"
          />
          <Input
            defaultValue={defaults.text('phone', settings.phone ?? '')}
            error={errorFor('phone')}
            inputMode="tel"
            label="Telefone"
            name="phone"
          />
          <Input
            defaultValue={defaults.text('whatsapp', settings.whatsapp ?? '')}
            error={errorFor('whatsapp')}
            inputMode="tel"
            label="WhatsApp"
            name="whatsapp"
          />
          <Input
            defaultValue={defaults.text('instagram', settings.instagram ?? '')}
            error={errorFor('instagram')}
            label="Instagram (sem @)"
            name="instagram"
          />
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-bold text-ink" htmlFor="notice">
              Aviso curto
            </label>
            <textarea
              aria-describedby={errorFor('notice') ? 'notice-error' : undefined}
              aria-invalid={Boolean(errorFor('notice'))}
              className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:outline-hidden focus:ring-4 focus:ring-brand/20"
              defaultValue={defaults.text('notice', settings.notice ?? '')}
              id="notice"
              maxLength={140}
              name="notice"
              placeholder="Ex.: Hoje fechamos às 15h"
            />
            {errorFor('notice') ? (
              <p className="text-sm text-danger" id="notice-error">
                {errorFor('notice')}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-card bg-white p-4 shadow-card lg:p-5">
        <h2 className="disp text-lg font-semibold text-ink">Status e horários</h2>
        <p className="mt-1 text-sm text-muted">Horários de Fortaleza e São Paulo.</p>
        <label className="mt-4 block text-sm font-bold text-ink" htmlFor="status_override">
          Funcionamento agora
          {/* O <select> só aplica o defaultValue ao montar: a key o recria com o valor salvo, ou com o
              enviado quando a action recusa. Sem ela, o reinício do formulário depois da action
              voltaria à opção antiga e a gravaria de novo no próximo envio. */}
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 text-sm font-normal text-ink sm:max-w-md"
            defaultValue={defaults.text('status_override', settings.status_override)}
            id="status_override"
            key={defaults.text('status_override', settings.status_override)}
            name="status_override"
          >
            <option value="auto">Seguir os horários abaixo</option>
            <option value="open">Manter aberta manualmente</option>
            <option value="closed">Manter fechada manualmente</option>
          </select>
        </label>
        {errorFor('opening_hours') ? (
          <AdminNotice className="mt-4" kind="error" message={errorFor('opening_hours')} />
        ) : null}
        <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl bg-surface-inner p-3">
          <label className="text-xs font-bold text-muted">
            Usar o horário de
            <select
              className="mt-1 block min-h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink"
              onChange={(event) => setCopySource(Number(event.target.value))}
              value={copySource}
            >
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => {
              setHours(copyOpeningHourToEveryDay(hours, copySource));
              setDirty(true);
            }}
            variant="neutral"
          >
            Copiar para todos os dias
          </Button>
        </div>
        <div className="mt-3 divide-y divide-border-inner rounded-xl border border-border bg-surface-inner px-2">
          {/* Os campos já têm rótulo próprio; este título é só para quem enxerga a tabela. */}
          <div
            aria-hidden="true"
            className="grid grid-cols-[minmax(56px,1fr)_96px_96px] gap-2 py-2 text-xs font-bold text-muted"
          >
            <span>Dia fechado?</span>
            <span className="text-center">Abre</span>
            <span className="text-center">Fecha</span>
          </div>
          {hours.map((hour) => {
            const hourError = errorFor(`opening_hours.${hour.day}.close`);
            return (
              <div
                className="grid min-h-[62px] grid-cols-[minmax(56px,1fr)_96px_96px] items-center gap-2 py-2"
                key={hour.day}
              >
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold text-ink">
                    {DAYS[hour.day]}
                  </span>
                  <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                    <input
                      aria-label={`${DAYS[hour.day]} fechado`}
                      checked={hour.closed}
                      className="size-5 shrink-0 accent-danger"
                      name={`closed-${hour.day}`}
                      onChange={(event) => updateHour(hour.day, { closed: event.target.checked })}
                      role="switch"
                      type="checkbox"
                    />
                    <span className={hour.closed ? 'font-bold text-danger' : undefined}>
                      Fechado
                    </span>
                  </label>
                </div>
                {/* Campo desativado não vai no envio: o horário guardado segue junto, para voltar
                    igual quando o dia abrir de novo. */}
                {hour.closed ? (
                  <>
                    <input name={`open-${hour.day}`} type="hidden" value={hour.open} />
                    <input name={`close-${hour.day}`} type="hidden" value={hour.close} />
                  </>
                ) : null}
                <label className="sr-only" htmlFor={`open-${hour.day}`}>
                  Abertura de {DAYS[hour.day]}
                </label>
                <input
                  className={`min-h-11 min-w-0 w-[96px] rounded-xl border border-border px-0 text-center text-sm ${hour.closed ? 'bg-surface-inner text-muted' : 'bg-white text-ink'}`}
                  disabled={hour.closed}
                  id={`open-${hour.day}`}
                  name={hour.closed ? undefined : `open-${hour.day}`}
                  onChange={(event) => updateHour(hour.day, { open: event.target.value })}
                  required={!hour.closed}
                  type="time"
                  value={hour.open}
                />
                <div>
                  <label className="sr-only" htmlFor={`close-${hour.day}`}>
                    Fechamento de {DAYS[hour.day]}
                  </label>
                  <input
                    aria-describedby={hourError ? `close-${hour.day}-error` : undefined}
                    aria-invalid={Boolean(hourError)}
                    className={`min-h-11 min-w-0 w-[96px] rounded-xl border border-border px-0 text-center text-sm ${hour.closed ? 'bg-surface-inner text-muted' : 'bg-white text-ink'}`}
                    disabled={hour.closed}
                    id={`close-${hour.day}`}
                    name={hour.closed ? undefined : `close-${hour.day}`}
                    onChange={(event) => updateHour(hour.day, { close: event.target.value })}
                    required={!hour.closed}
                    type="time"
                    value={hour.close}
                  />
                  {hourError ? (
                    <p className="mt-1 text-xs text-danger" id={`close-${hour.day}-error`}>
                      {hourError}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <AdminNotice kind={state.status === 'error' ? 'error' : 'success'} message={state.message} />
      <div className="hidden justify-end lg:flex">
        <SaveButton />
      </div>
      <div className="fixed inset-x-0 bottom-[4.65rem] z-30 border-t border-border bg-white/95 p-3 shadow-[0_-3px_12px_rgba(23,17,13,0.08)] backdrop-blur lg:hidden">
        <SaveButton />
      </div>
    </form>
  );
}
