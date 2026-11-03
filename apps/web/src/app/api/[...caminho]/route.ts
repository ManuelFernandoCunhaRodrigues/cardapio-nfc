import { handleApiRoute } from '@/lib/api/embedded-api';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = handleApiRoute;
export const HEAD = handleApiRoute;
export const POST = handleApiRoute;
export const PUT = handleApiRoute;
export const PATCH = handleApiRoute;
export const DELETE = handleApiRoute;
export const OPTIONS = handleApiRoute;
