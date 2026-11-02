import { z } from 'zod';

/** Field rules shared by the API contracts and browser forms. Must stay free of server imports. */
export const identifierPattern = /^[A-Za-z0-9_-]{1,128}$/;
export const idSchema = z.string().regex(identifierPattern);
export const shortText = z.string().trim().min(1).max(300);
export const proseText = z.string().trim().min(1).max(2000);
