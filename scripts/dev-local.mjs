import { execSync, spawn } from 'node:child_process';

/**
 * Runs the app locally against the live Firebase project, exactly as in production: real Google
 * sign-in, real Firestore and Gemini. Uses your application default credentials
 * (gcloud auth application-default login). Everything you do here changes live data.
 */
const project = process.env.GCP_PROJECT_ID || 'sop-app-prod-511406';
const gcloud = (args) =>
  execSync(`gcloud ${args} --project ${project}`, { encoding: 'utf8' }).trim();

const env = {
  ...process.env,
  GOOD_EXCEPTION_MODE: 'production',
  GOOGLE_CLOUD_PROJECT: project,
  GOOD_EXCEPTION_PSEUDONYM_KEY: gcloud(
    'secrets versions access latest --secret sop-app-pseudonym-key',
  ),
  GOOD_EXCEPTION_GEMINI_MODEL: process.env.GOOD_EXCEPTION_GEMINI_MODEL || 'gemini-3.5-flash',
  GOOD_EXCEPTION_LOCAL: 'true',
  // Matches Cloud Run (infra/run.tf): every signed-in user joins the prototype org as admin.
  GOOD_EXCEPTION_OPEN_ORGANIZATION: 'prototype',
  GOOD_EXCEPTION_OPEN_ROLE: 'admin',
};
delete env.FIRESTORE_EMULATOR_HOST;
delete env.FIREBASE_AUTH_EMULATOR_HOST;

const command = 'next dev --hostname 127.0.0.1';
// Windows ships npx as npx.cmd, which Node only runs through a shell.
const child = spawn(`npx ${command}`, { stdio: 'inherit', env, shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
