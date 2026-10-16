import { test, expect, type Page } from '@playwright/test';

async function answer(page: Page, nextButton: string) {
  await page
    .getByLabel('Your explanation')
    .fill('Pressure can look stable at first, then drift as the assembly settles.');
  await page.getByRole('button', { name: nextButton }).click();
}

test('an expert walkthrough becomes a published baseline, surviving a mid-flow refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Create first SOP|Capture a process/ }).click();
  await expect(page).toHaveURL('/processes/new');
  await page.getByLabel('Process name').fill('Valve Replacement');
  await page.getByLabel('Equipment / job type').fill('Valve assembly X');
  await page
    .getByLabel('Or paste a walkthrough')
    .fill('Isolate supply. Replace valve. Test pressure. Wait 3–5 minutes. Test again. Close job.');
  await page.getByRole('button', { name: 'Analyze walkthrough' }).click();

  // The first draft compiles several dev routes on demand; slower machines need more than 5s.
  await expect(page).toHaveURL(/\/captures\/[^/]+\/steps$/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Clarify the know-how' }).click();
  await expect(page).toHaveURL(/\/clarify$/);
  await answer(page, 'Next question');
  await expect(page.getByText('Question 2 of 2')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Question 2 of 2')).toBeVisible();
  await answer(page, 'Build SOP draft');

  await expect(page).toHaveURL(/\/review$/);
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
  // The UI no longer offers the sample; the local demo API still creates it for the seeded baseline.
  await page.goto('/');
  const scanId = await page.evaluate(async () => {
    const post = (path: string, body: unknown) =>
      fetch(`/api/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json() as Promise<{ id: string }>);
    const scan = await post('scans', { processId: 'valve-replacement', demo: true });
    await post(`scans/${scan.id}/readiness`, {});
    return scan.id;
  });
  await page.goto(`/scans/${scanId}`);
  await expect(page.getByRole('heading', { name: 'What the records can tell us.' })).toBeVisible();
  await page.getByRole('button', { name: 'Run sample scan' }).click();

  await expect(page).toHaveURL(/\/scans\/[^/]+\/results$/);
  await expect(
    page.getByRole('heading', { name: 'Two practices worth investigating.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Review findings' }).click();
  await page.getByRole('link', { name: 'Review finding', exact: true }).first().click();
  await page.getByRole('button', { name: 'Record why it works' }).click();
  await page
    .getByLabel('Why does this practice work?')
    .fill('Pressure can look stable at first, then drift as the assembly settles.');
  await page.getByRole('button', { name: 'Save explanation' }).click();
  await expect(page.getByRole('heading', { name: 'The why behind the practice.' })).toBeVisible();

  await page.getByRole('link', { name: 'Create validation trial' }).click();
  await page.getByRole('button', { name: 'Save trial plan' }).click();
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
  await expect(page.getByRole('button', { name: 'Run scan', exact: true })).toBeDisabled();
});

test('on a phone the layout fits and the tab bar navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Good work deserves/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('complementary')).toBeHidden();

  const tabs = page.getByRole('navigation', { name: 'Tab bar' });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await tabs.getByRole('link', { name: /Processes/ }).click();
  await expect(page).toHaveURL('/processes');
  await expect(page.getByRole('heading', { name: 'Processes', exact: true })).toBeVisible();
  await expect(tabs.getByRole('link', { name: /Processes/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('on a desktop the sidebar navigates and the tab bar is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await expect(page.getByRole('complementary')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Tab bar' })).toBeHidden();
  await nav.getByRole('link', { name: /Findings/ }).click();
  await expect(page).toHaveURL('/findings');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Findings');
});
