import type { SVGProps } from 'react';

export type AdminIconName =
  | 'grid'
  | 'products'
  | 'tag'
  | 'star'
  | 'store'
  | 'logout'
  | 'plus'
  | 'search'
  | 'edit'
  | 'up'
  | 'down'
  | 'more'
  | 'back'
  | 'eye'
  | 'eye-off'
  | 'camera'
  | 'video'
  | 'close'
  | 'clock'
  | 'alert'
  | 'check';

const paths: Record<AdminIconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  products: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  tag: (
    <>
      <path d="M20 13 13 20 4 11V4h7Z" />
      <circle cx="8.5" cy="8.5" r="1" />
    </>
  ),
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
  store: (
    <>
      <path d="M4 10v10h16V10M3 10l2-6h14l2 6" />
      <path d="M8 20v-5h4v5M3 10c1.5 2 3.5 2 5 0 1.5 2 3.5 2 5 0 1.5 2 3.5 2 5 0 1 1.3 2 1.3 3 0" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4-4" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10Z" />
      <path d="m13.5 7 3.5 3.5" />
    </>
  ),
  up: <path d="m6 14 6-6 6 6" />,
  down: <path d="m6 10 6 6 6-6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m4 4 16 16M10.6 6.1A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 2.4-.3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h4l1.5-2h5L16 8h4v11H4Z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 3 20h18Z" />
      <path d="M12 9v4M12 16h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

export function AdminIcon({
  name,
  ...props
}: Readonly<{ name: AdminIconName } & SVGProps<SVGSVGElement>>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
