import { getStoreStatus, type StatusSettings } from '@/lib/store/opening-hours';

export type PublicStoreStatusSettings = StatusSettings;

export function selectPublicStoreStatusSettings(settings: StatusSettings): PublicStoreStatusSettings {
  return {
    opening_hours: settings.opening_hours,
    status_override: settings.status_override,
  };
}

export function getClientStoreStatus(settings: PublicStoreStatusSettings, now: Date) {
  return getStoreStatus(settings, now);
}
