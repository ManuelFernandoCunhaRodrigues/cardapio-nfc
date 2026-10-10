import Link from 'next/link';

import { Icon } from '@/components/menu/icons';
import { getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { getStoreStatus } from '@/lib/store/opening-hours';

export const revalidate = 60;
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function formatTime(date: Date) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date); }
function currentDay() {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date());
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekday];
}

export default async function InfoPage() {
  const settings = await getPublicStoreSettings();
  if (!settings) return <main className="p-4 pt-6"><h1 className="disp text-2xl font-extrabold text-ink">Informações</h1><section className="mt-5 rounded-card bg-cream p-5"><h2 className="disp text-xl font-bold text-ink">Informações indisponíveis agora</h2><p className="mt-2 text-sm leading-6 text-muted">Tente novamente em instantes ou fale com a equipe no balcão.</p></section></main>;
  const status = getStoreStatus(settings, new Date());
  const detail = status.isOpen && status.closesAt ? `Fecha às ${formatTime(status.closesAt)}` : !status.isOpen && status.opensNext ? `Abre às ${formatTime(status.opensNext)}` : status.isOpen ? 'Atendendo agora' : 'Fechada no momento';
  const today = currentDay();
  return <main className="p-4 pt-6"><h1 className="disp text-2xl font-extrabold text-ink">Informações</h1><section className={`mt-5 rounded-card p-5 ${status.isOpen ? 'bg-positive/10' : 'bg-danger/10'}`}><p className="font-mono text-[10px] font-bold tracking-[0.12em] text-muted">STATUS DA LOJA</p><h2 className={`disp mt-1 text-2xl font-extrabold ${status.isOpen ? 'text-positive' : 'text-danger'}`}>{status.isOpen ? 'Aberta' : 'Fechada'}</h2><p className="mt-1 text-sm font-semibold text-body">{detail}</p>{settings.notice ? <p className="mt-4 rounded-product bg-white/65 px-3 py-2 text-sm leading-5 text-body">{settings.notice}</p> : null}</section><section className="mt-7" aria-labelledby="horarios"><h2 className="disp text-xl font-bold text-ink" id="horarios">Horários</h2><dl className="mt-3 overflow-hidden rounded-card border border-border">{[...settings.opening_hours].sort((a, b) => a.day - b.day).map((hour) => <div className={`flex justify-between px-4 py-3 text-sm ${hour.day === today ? 'bg-brand/10 font-bold text-ink' : 'bg-white text-body'} ${hour.day !== 6 ? 'border-b border-border/70' : ''}`} key={hour.day}><dt>{weekdays[hour.day]}</dt><dd>{hour.closed ? 'Fechado' : `${hour.open} às ${hour.close}`}</dd></div>)}</dl></section><section className="mt-7 space-y-3" aria-label="Contato">{settings.address ? <InfoLink href={settings.maps_url ?? undefined} icon="pin" label={settings.address} /> : null}{settings.phone ? <InfoLink href={`tel:${settings.phone}`} icon="phone" label={settings.phone} /> : null}{settings.whatsapp ? <InfoLink href={`https://wa.me/${settings.whatsapp}`} icon="phone" label="WhatsApp" /> : null}{settings.instagram ? <InfoLink href={`https://instagram.com/${settings.instagram}`} icon="instagram" label={`@${settings.instagram}`} /> : null}</section></main>;
}

function InfoLink({ href, icon, label }: Readonly<{ href?: string; icon: 'pin' | 'phone' | 'instagram'; label: string }>) {
  const content = <><span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-inner text-brand"><Icon name={icon} /></span><span className="text-sm font-bold text-ink">{label}</span></>;
  return href ? <Link className="flex min-h-14 items-center gap-3 rounded-product border border-border bg-white px-3 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={href} rel={href.startsWith('http') ? 'noreferrer' : undefined} target={href.startsWith('http') ? '_blank' : undefined}>{content}</Link> : <div className="flex min-h-14 items-center gap-3 rounded-product border border-border bg-white px-3">{content}</div>;
}
