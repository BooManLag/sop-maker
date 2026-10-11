import type { ServerConfig } from './config';
import { ApiError } from './errors';
import { localRequestOrigin } from './origin';
export type Role = 'viewer' | 'expert' | 'reviewer' | 'admin';
export interface Actor {
  userId: string;
  organizationId: string;
  role: Role;
  authTime: number;
  mfa: boolean;
  demo: boolean;
}
export interface RequestContext {
  actor: Actor;
  requestId: string;
  idempotencyKey?: string;
}
export interface VerifiedClaims {
  uid: string;
  organizationId?: unknown;
  role?: unknown;
  auth_time?: number;
  exp?: number;
  firebase?: { sign_in_second_factor?: string };
}
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedClaims>;
}
export const demoActor: Actor = {
  userId: 'demo-reviewer',
  organizationId: 'demo-org',
  role: 'admin',
  authTime: 0,
  mfa: false,
  demo: true,
};
const identifier = /^[A-Za-z0-9_-]{1,128}$/;
export async function authenticate(
  request: Request,
  config: ServerConfig,
  verifier: TokenVerifier,
): Promise<Actor> {
  if (config.mode === 'demo') {
    if (!localRequestOrigin(request))
      throw new ApiError(403, 'The demo is available only through a loopback host.');
    return { ...demoActor };
  }
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(authorization))
    throw new ApiError(401, 'A valid Firebase bearer token is required.');
  let claims: VerifiedClaims;
  try {
    claims = await verifier.verify(authorization.slice(7));
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) throw error;
    throw new ApiError(401, 'The session is invalid, expired, revoked, or disabled.');
  }
  if (
    !identifier.test(String(claims.organizationId ?? '')) ||
    !identifier.test(claims.uid) ||
    !['viewer', 'expert', 'reviewer', 'admin'].includes(String(claims.role))
  )
    throw new ApiError(403, 'An organization membership and a permitted role are required.');
  if (
    !claims.exp ||
    claims.exp * 1000 <= Date.now() ||
    !claims.auth_time ||
    claims.auth_time * 1000 > Date.now() + 60_000
  )
    throw new ApiError(401, 'The session is invalid or expired.');
  return {
    userId: claims.uid,
    organizationId: String(claims.organizationId),
    role: claims.role as Role,
    authTime: claims.auth_time,
    mfa: !!claims.firebase?.sign_in_second_factor,
    demo: false,
  };
}
export type Permission = 'read' | 'write' | 'review' | 'admin';
export function authorize(actor: Actor, permission: Permission, config: ServerConfig) {
  if (!identifier.test(actor.organizationId) || !identifier.test(actor.userId))
    throw new ApiError(403, 'Invalid actor context.');
  if (config.mode === 'production' && actor.demo)
    throw new ApiError(401, 'Demo identities cannot access production.');
  const granted: Record<Permission, Role[]> = {
    read: ['viewer', 'expert', 'reviewer', 'admin'],
    write: ['expert', 'reviewer', 'admin'],
    review: ['reviewer', 'admin'],
    admin: ['admin'],
  };
  if (!granted[permission].includes(actor.role))
    throw new ApiError(403, 'Your role does not permit this operation.');
  if (
    !actor.demo &&
    (permission === 'review' || permission === 'admin') &&
    config.requireMfa &&
    (!actor.mfa || Date.now() / 1000 - actor.authTime > 600)
  )
    throw new ApiError(403, 'Recent multi-factor authentication is required for this action.');
}
