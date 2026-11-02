import { createApiClient } from './api';
import { currentToken } from './auth';

/** Browser API client. Sends the signed-in person's ID token; the loopback demo has none. */
export const api = createApiClient({ getToken: currentToken });
