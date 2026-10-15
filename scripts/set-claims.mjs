// Grant a signed-in user an organization and role: node scripts/set-claims.mjs <email> <organizationId> <role>
// Uses application default credentials (gcloud auth application-default login).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email, organizationId, role] = process.argv.slice(2);
if (
  !email ||
  !/^[A-Za-z0-9_-]{1,128}$/.test(organizationId ?? '') ||
  !['viewer', 'expert', 'reviewer', 'admin'].includes(role)
) {
  console.error('Usage: node scripts/set-claims.mjs <email> <organizationId> <viewer|expert|reviewer|admin>');
  process.exit(1);
}
initializeApp({ projectId: process.env.GCP_PROJECT_ID ?? 'sop-app-prod-511406' });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, organizationId, role });
console.log(`${email} (${user.uid}) → organizationId=${organizationId}, role=${role}. Sign out and back in to pick it up.`);
