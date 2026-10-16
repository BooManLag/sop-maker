import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import { FirestoreRepository } from '../src/lib/infrastructure/firestore-repository';
import { purgeProcess } from '../src/lib/application/process-service';
import type { Store } from '../src/lib/application/store';

/**
 * Deletes archived processes (with everything recorded against them) and storage objects no
 * record points at, in the live project. Lists what it would remove unless run with --apply.
 *
 *   npm run storage:cleanup            # dry run
 *   npm run storage:cleanup -- --apply # delete
 */
const project = process.env.GCP_PROJECT_ID || 'sop-app-prod-511406';
const bucketName = process.env.GOOD_EXCEPTION_MEDIA_BUCKET || `${project}-media`;
const apply = process.argv.includes('--apply');
/** Objects younger than this may belong to an upload or publish still in flight. */
const graceMs = 3600_000;

const database = getFirestore(
  initializeApp({ projectId: project, credential: applicationDefault() }),
);
const bucket = new Storage({ projectId: project }).bucket(bucketName);

const referencedMedia = (s: Store) =>
  [
    ...s.processes.flatMap((p) =>
      p.versions.flatMap((v) => v.steps.flatMap((step) => step.frameObjectPath ?? [])),
    ),
    ...s.captures.flatMap((c) => (c.media ? [c.media.objectPath, c.media.cleanPath ?? []] : [])),
  ].flat();

async function main() {
  console.log(`${apply ? 'Cleaning' : 'Dry run for'} ${project}, bucket ${bucketName}\n`);
  const organizations = (await database.collection('organizations').listDocuments()).map(
    (d) => d.id,
  );
  const referenced = new Set<string>();

  for (const organizationId of organizations) {
    const repository = new FirestoreRepository(database, organizationId);
    const store = await repository.read();
    const archived = store.processes.filter((p) => p.archivedAt);
    for (const p of archived)
      console.log(
        `[${organizationId}] archived process: ${p.title} (${p.id}), archived ${p.archivedAt}`,
      );
    if (apply && archived.length)
      await repository.transact((s) => {
        for (const p of s.processes.filter((x) => x.archivedAt))
          purgeProcess(s, p.id, { title: p.title });
      });
    const kept = apply ? await repository.read() : store;
    // In a dry run, archived processes' media counts as orphaned, since --apply would free it.
    const live = apply
      ? kept
      : {
          ...kept,
          processes: kept.processes.filter((p) => !p.archivedAt),
          captures: kept.captures.filter((c) => !archived.some((p) => p.id === c.processId)),
        };
    for (const path of referencedMedia(live)) referenced.add(path);
  }

  const [files] = await bucket.getFiles();
  const now = Date.now();
  const orphans = files.filter(
    (f) => !referenced.has(f.name) && now - Date.parse(String(f.metadata.updated)) > graceMs,
  );
  let bytes = 0;
  for (const f of orphans) {
    bytes += Number(f.metadata.size ?? 0);
    console.log(`orphaned object: ${f.name}`);
  }
  console.log(
    `\n${files.length} objects in bucket, ${orphans.length} orphaned (${(bytes / 1e6).toFixed(1)} MB).`,
  );
  if (!apply) {
    console.log('Nothing deleted. Re-run with --apply to delete the items listed above.');
    return;
  }
  for (const f of orphans) await f.delete({ ignoreNotFound: true });
  console.log('Deleted.');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
