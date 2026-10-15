import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { MediaStorage, UploadSigner } from '../application/ports';
import type { MediaWorker } from '../application/media-worker';
import { ApiError } from '../server/errors';

/** Server-built object paths only: area, tenant, process, optional `frames/`, upload id. */
const segment = '[A-Za-z0-9_-]{1,128}';
const objectPathPattern = new RegExp(
  `^(quarantine|clean)/${segment}/${segment}(/frames)?/${segment}$`,
);
const uploadTtlMs = 15 * 60_000;

/** Demo media objects on local disk, laid out exactly like the Cloud Storage bucket. */
export class LocalMediaStore implements MediaStorage {
  constructor(private root: string) {}
  private file(objectPath: string) {
    if (!objectPathPattern.test(objectPath)) throw new Error('Invalid media object path.');
    return path.join(this.root, ...objectPath.split('/'));
  }
  async write(objectPath: string, bytes: Uint8Array) {
    const file = this.file(objectPath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.partial`, bytes);
    await rename(`${file}.partial`, file);
  }
  async read(objectPath: string) {
    return new Uint8Array(await readFile(this.file(objectPath)));
  }
  async promote(from: string, to: string) {
    const target = this.file(to);
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await rename(this.file(from), target);
    } catch (error) {
      // A finished move is a no-op, as with the bucket adapter.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !(await exists(target)))
        throw error;
    }
  }
  async remove(objectPath: string) {
    await rm(this.file(objectPath), { force: true });
  }
}
const exists = (file: string) =>
  stat(file).then(
    () => true,
    () => false,
  );

const grantSchema = z
  .object({
    objectPath: z.string().regex(objectPathPattern),
    contentType: z.string().max(64),
    maxBytes: z.number().int().positive(),
    expiresAt: z.number().int(),
  })
  .strict();
type Grant = z.infer<typeof grantSchema>;

/**
 * Stands in for Cloud Storage signed URLs in the loopback demo: the URL carries an HMAC-signed
 * grant for one object, type and size, and expires after 15 minutes.
 */
export class LocalUploadSigner implements UploadSigner {
  private key = randomBytes(32);
  constructor(private now = () => Date.now()) {}
  async sign(request: { objectPath: string; contentType: string; maxBytes: number }) {
    const grant: Grant = { ...request, expiresAt: this.now() + uploadTtlMs };
    const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
    return { url: `/api/v1/internal/media-upload?grant=${payload}.${this.mac(payload)}` };
  }
  verify(token: string | null): Grant | undefined {
    const [payload, mac, extra] = (token ?? '').split('.');
    if (!payload || !mac || extra !== undefined) return undefined;
    const expected = Buffer.from(this.mac(payload));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
    try {
      const grant = grantSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
      return grant.expiresAt > this.now() ? grant : undefined;
    } catch {
      return undefined;
    }
  }
  private mac(payload: string) {
    return createHmac('sha256', this.key).update(payload).digest('base64url');
  }
}

/** Receives a demo upload PUT, stores it in quarantine and processes recordings inline. */
export class LocalMediaUploads {
  constructor(
    private signer: LocalUploadSigner,
    private store: LocalMediaStore,
    private worker: MediaWorker,
  ) {}
  async receive(request: Request) {
    const grant = this.signer.verify(new URL(request.url).searchParams.get('grant'));
    if (!grant) throw new ApiError(403, 'The upload link is invalid or expired.');
    const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (type !== grant.contentType)
      throw new ApiError(415, `Content-Type must be ${grant.contentType}.`);
    const bytes = await readBytes(request, grant.maxBytes);
    if (!bytes.byteLength) throw new ApiError(400, 'The upload is empty.');
    await this.store.write(grant.objectPath, bytes);
    // Frames are only stored; recordings are inspected and transcribed before responding.
    if (!grant.objectPath.includes('/frames/'))
      await this.worker.process({ objectPath: grant.objectPath }, true);
  }
}
async function readBytes(request: Request, maxBytes: number) {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes))
    throw new ApiError(413, 'The upload is larger than requested.');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = (await reader?.read()) ?? { done: true, value: undefined };
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader?.cancel();
      throw new ApiError(413, 'The upload is larger than requested.');
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
