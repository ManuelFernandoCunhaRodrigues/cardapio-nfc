export const storeSettingsFixture = {
  id: true as const,
  name: 'Salgaê',
  tagline: null,
  address: null,
  maps_url: null,
  phone: null,
  whatsapp: null,
  instagram: null,
  opening_hours: Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: false,
    open: '08:00',
    close: '18:00',
  })),
  status_override: 'auto' as const,
  notice: null,
  updated_at: '2026-10-30T12:00:00.000Z',
};
