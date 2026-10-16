import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Storage } from '@google-cloud/storage';
import type { UploadSigner, WritableMediaStorage } from '../application/ports';

const uploadTtlMs = 15 * 60_000;
const readTtlMs = 15 * 60_000;
const notFound = (error: unknown) => (error as { code?: number }).code === 404;

/**
 * Media objects in the Cloud Storage bucket. Signing uses the runtime service account through
 * IAM signBlob, so the account needs Token Creator on itself.
 */
export class GcsMedia implements WritableMediaStorage, UploadSigner {
  private bucket;
  constructor(bucketName: string) {
    this.bucket = new Storage().bucket(bucketName);
  }
  async sign({
    objectPath,
    contentType,
    maxBytes,
  }: {
    objectPath: string;
    contentType: string;
    maxBytes: number;
  }) {
    const [url] = await this.bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + uploadTtlMs,
      contentType,
      // Must match the header the browser sends (see `uploadTarget`); storage enforces the cap.
      extensionHeaders: { 'x-goog-content-length-range': `0,${maxBytes}` },
    });
    return { url };
  }
  /** A short-lived link for the browser to display a stored image. */
  async signRead(objectPath: string, contentType: string) {
    const [url] = await this.bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + readTtlMs,
      responseType: contentType,
    });
    return url;
  }
  async write(objectPath: string, bytes: Uint8Array) {
    await this.bucket.file(objectPath).save(Buffer.from(bytes), { resumable: false });
  }
  /** The `gs://` address Vertex AI reads the object from directly. */
  uri(objectPath: string) {
    return `gs://${this.bucket.name}/${objectPath}`;
  }
  async open(objectPath: string) {
    const file = this.bucket.file(objectPath);
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    return {
      size,
      async read(start: number, end: number) {
        const last = Math.min(end, size) - 1;
        if (last < start) return new Uint8Array();
        // Cloud Storage ranges include their end byte.
        const [bytes] = await file.download({ start, end: last });
        return new Uint8Array(bytes);
      },
    };
  }
  async sha256(objectPath: string) {
    const hash = createHash('sha256');
    await pipeline(this.bucket.file(objectPath).createReadStream(), hash);
    return hash.digest('hex');
  }
  async exists(objectPath: string) {
    const [found] = await this.bucket.file(objectPath).exists();
    return found;
  }
  async promote(from: string, to: string) {
    try {
      await this.bucket.file(from).move(to);
    } catch (error) {
      // A finished move is a no-op.
      if (!notFound(error) || !(await this.exists(to))) throw error;
    }
  }
  async remove(objectPath: string) {
    await this.bucket.file(objectPath).delete({ ignoreNotFound: true });
  }
}
