import type { Context } from 'hono';

import type { AppHonoEnv } from '../../shared/types';
import type { SessionService } from './session.service';

export function createSessionController(service: SessionService) {
  return (context: Context<AppHonoEnv>) =>
    context.json(service.getSession(context.get('user'), context.get('adminName')));
}
