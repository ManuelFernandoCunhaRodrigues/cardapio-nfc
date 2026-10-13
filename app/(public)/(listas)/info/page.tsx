import Link from 'next/link';

import { Icon, type IconName } from '@/components/menu/icons';
import { StoreInfoStatus, StoreOpeningHours } from '@/components/menu/store-status-live';
import { getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { selectPublicStoreStatusSettings } from '@/lib/store/client-status';

export const revalidate = 60;

export default async function InfoPage() {
  const settings = await getPublicStoreSettings();
  if (!settings) return <main className="p-4 pt-1"><h1 className="disp text-2xl font-bold text-ink">Informações</h1><section className="mt-5 rounded-card bg-white p-5"><h2 className="disp text-xl font-bold text-ink">Informações indisponíveis agora</h2><p className="mt-2 text-sm leading-6 text-muted">Tente novamente em instantes ou fale com a equipe no balcão.</p></section></main>;

  const initialNow = new Date().toISOString();
  const publicSettings = selectPublicStoreStatusSettings(settings);
  const hasContact = Boolean(settings.address || settings.phone || settings.whatsapp || settings.instagram);

  return <main className="p-4 pt-1"><h1 className="disp text-2xl font-bold text-ink">Informações</h1>
    <StoreInfoStatus initialNow={initialNow} notice={settings.notice} settings={publicSettings} />
    <section className="mt-4" aria-labelledby="horarios"><h2 className="disp text-lg font-semibold text-ink" id="horarios">Horários</h2><StoreOpeningHours initialNow={initialNow} settings={publicSettings} /></section>
    {hasContact ? <section className="mt-4" aria-labelledby="contato"><h2 className="disp text-lg font-semibold text-ink" id="contato">Endereço e contato</h2>{settings.address ? <AddressLink address={settings.address} href={settings.maps_url} /> : null}<div className="mt-2 grid grid-cols-3 gap-2">{settings.phone ? <ContactLink href={`tel:${settings.phone}`} icon="phone" label="Ligar" /> : null}{settings.whatsapp ? <ContactLink href={`https://wa.me/${settings.whatsapp}`} icon="whatsapp" label="WhatsApp" /> : null}{settings.instagram ? <ContactLink href={`https://instagram.com/${settings.instagram}`} icon="instagram" label="Instagram" /> : null}</div></section> : null}
  </main>;
}

function AddressLink({ address, href }: Readonly<{ address: string; href: string | null }>) {
  const content = <><span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-inner text-brand-strong"><Icon name="pin" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{address}</strong>{href ? <span className="block text-xs text-muted">Ver no mapa</span> : null}</span>{href ? <Icon className="text-muted" name="arrow-simple" /> : null}</>;
  return href ? <Link className="mt-2 flex min-h-14 items-center gap-3 rounded-product bg-white px-3 shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" href={href} rel="noreferrer" target="_blank">{content}</Link> : <div className="mt-2 flex min-h-14 items-center gap-3 rounded-product bg-white px-3 shadow-card">{content}</div>;
}

function ContactLink({ href, icon, label }: Readonly<{ href: string; icon: IconName; label: string }>) {
  return <Link className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-product bg-white text-brand-strong shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" href={href} rel={href.startsWith('http') ? 'noreferrer' : undefined} target={href.startsWith('http') ? '_blank' : undefined}><Icon name={icon} /><span className="text-xs font-bold text-ink">{label}</span></Link>;
}
