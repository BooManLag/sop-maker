import { createApiClient } from './api';

/** Browser API client. Production sign-in will supply `getToken`; the loopback demo needs none. */
export const api = createApiClient();
