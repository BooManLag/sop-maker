import { test, expect, type Page } from '@playwright/test';

async function useSampleExplanation(page: Page, nextButton: string) {
  await page.getByRole('button', { name: 'Use sample expert explanation' }).click();
  await page.getByRole('button', { name: nextButton }).click();
}

test('an expert walkthrough becomes a published baseline, surviving a mid-flow refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Create first SOP/ }).click();
  await expect(page).toHaveURL('/processes/new');
  await page.getByRole('button', { name: 'Use sample walkthrough' }).click();
  await page.getByRole('button', { name: 'Analyze walkthrough' }).click();

  await expect(page).toHaveURL(/\/captures\/[^/]+\/steps\?sample=1$/);
  await page.getByRole('button', { name: 'Clarify the know-how' }).click();
  await expect(page).toHaveURL(/\/clarify\?sample=1$/);
  await useSampleExplanation(page, 'Next question');
  await expect(page.getByText('Question 2 of 2')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Question 2 of 2')).toBeVisible();
  await useSampleExplanation(page, 'Build SOP draft');

  await expect(page).toHaveURL(/\/review\?sample=1$/);
  await page.getByRole('button', { name: 'Publish baseline SOP' }).click();
  await expect(page.getByText('Approve the procedure before publishing it.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Publish baseline SOP' }).click();

  await expect(page).toHaveURL(/\/published$/);
  await expect(
    page.getByRole('heading', { name: 'Your know-how is now a standard.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View living SOP' }).click();
  await expect(page.getByText('Human-approved baseline')).toBeVisible();
});

test('a sample scan leads to a trial and a change request without touching the baseline', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Improve existing SOP/ }).click();
  await page.getByRole('button', { name: /Use sample service records/ }).click();
  await expect(page.getByRole('heading', { name: 'What the records can tell us.' })).toBeVisible();
  await page.getByRole('button', { name: 'Run sample scan' }).click();

  await expect(page).toHaveURL(/\/scans\/[^/]+\/results$/);
  await expect(
    page.getByRole('heading', { name: 'Two practices worth investigating.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Review findings' }).click();
  await page.getByRole('link', { name: 'Review finding', exact: true }).first().click();
  await page.getByRole('button', { name: 'Ask technicians why' }).click();
  await expect(page.getByRole('heading', { name: 'The why behind the practice.' })).toBeVisible();

  await page.getByRole('link', { name: 'Create validation trial' }).click();
  await page.getByRole('button', { name: 'Start demo validation' }).click();
  await expect(page).toHaveURL(/\/trials\/[^/]+$/);
  await page.getByRole('button', { name: 'Load sample trial result' }).click();
  await page.getByRole('button', { name: 'Propose SOP update' }).click();

  await expect(page).toHaveURL(/\/change-requests\/[^/]+$/);
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Submitted for approval', exact: true }),
  ).toBeDisabled();
  const baseline = await (await page.request.get('/api/processes/valve-replacement')).json();
  expect(baseline.currentVersion).toBe(1);
});

test('insufficient uploaded records do not produce findings', async ({ page }) => {
  await page.goto('/scans/new');
  await page.locator('input[type=file]').setInputFiles('public/sample-jobs.csv');
  await expect(page.getByText('2 jobs imported.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Check data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Not enough evidence for a reliable scan.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run sample scan' })).toBeDisabled();
});

test('on a phone the layout fits and the menu navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Good work deserves/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /Processes/ })
    .click();
  await expect(page).toHaveURL('/processes');
  await expect(page.getByRole('heading', { name: 'Processes', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});
