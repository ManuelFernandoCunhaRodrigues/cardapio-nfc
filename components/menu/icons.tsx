import type { SVGProps } from 'react';

export type IconName = 'home' | 'menu' | 'search' | 'info' | 'arrow' | 'arrow-simple' | 'clock' | 'pin' | 'phone' | 'whatsapp' | 'instagram' | 'play' | 'back' | 'check' | 'alert' | 'pause';

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 21v-6h6v6" /></>,
  menu: <><rect height="16" rx="2" width="16" x="4" y="4" /><path d="M8 9h8M8 15h8" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4-4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  'arrow-simple': <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
  phone: <path d="M6.6 3.5 9 7.2 7.5 9c.8 2 2.3 3.5 4.3 4.3l1.8-1.5 3.7 2.4-1.1 3.2c-.3.8-1.1 1.2-1.9 1C7.7 16.9 4.1 13.3 3.6 6.7c-.1-.8.3-1.6 1-1.9z" />,
  whatsapp: <><path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" /><path d="M8.2 8.1c.5 3.2 2.4 5.1 5.6 5.8l1.2-1.4-2-1.1-.9 1c-1.2-.4-2.2-1.3-2.7-2.6l1-1-1.1-2Z" /></>,
  instagram: <><rect height="15" rx="4" width="15" x="4.5" y="4.5" /><circle cx="12" cy="12" r="3.5" /><path d="M17.5 6.8h.01" /></>,
  play: <path d="m9 7 8 5-8 5z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8 7v10M16 7v10" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="M12 4 3 20h18Z" /><path d="M12 9v4M12 16h.01" /></>,
};

export function Icon({ name, ...props }: Readonly<{ name: IconName } & SVGProps<SVGSVGElement>>) {
  return <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24" width="20" {...props}>{paths[name]}</svg>;
}
