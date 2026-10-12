// Budget notifications are delayed and can be retried or delivered out of order.
// This is an optional outage mechanism, never a guaranteed spending ceiling.
function createHandler({
  projectId,
  budgetName,
  budgetAmount,
  topic,
  dryRun = true,
  billingApi,
  now = () => new Date(),
  log = console.log,
}) {
  if (
    !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId ?? '') ||
    !budgetName ||
    !topic ||
    !Number.isFinite(budgetAmount) ||
    budgetAmount <= 0
  ) {
    throw new Error('Invalid billing shutoff configuration');
  }
  return async (event) => {
    const report = (message) => log(JSON.stringify({ event: 'billing_cap', message }));
    let data;
    try {
      const encoded = event?.data?.message?.data;
      if (typeof encoded !== 'string' || encoded.length > 32768)
        return report('invalid notification');
      data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    } catch {
      return report('invalid notification');
    }
    if (
      !data ||
      typeof data !== 'object' ||
      event.source !== `//pubsub.googleapis.com/${topic}` ||
      data.budgetDisplayName !== budgetName ||
      data.currencyCode !== 'USD' ||
      data.budgetAmountType !== 'SPECIFIED_AMOUNT' ||
      typeof data.costAmount !== 'number' ||
      !Number.isFinite(data.costAmount) ||
      data.costAmount < 0 ||
      typeof data.budgetAmount !== 'number' ||
      data.budgetAmount !== budgetAmount
    ) {
      return report('unrecognized notification');
    }
    const date = now();
    const interval = new Date(data.costIntervalStart);
    // Google calendar-month budgets use US Pacific time, including daylight saving.
    const parts = (value) =>
      Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        })
          .formatToParts(value)
          .map(({ type, value }) => [type, value]),
      );
    if (
      typeof data.costIntervalStart !== 'string' ||
      !Number.isFinite(interval.getTime()) ||
      interval > date
    )
      return report('stale or invalid billing interval');
    const current = parts(date);
    const start = parts(interval);
    if (
      start.year !== current.year ||
      start.month !== current.month ||
      start.day !== '01' ||
      start.hour !== '00' ||
      start.minute !== '00' ||
      start.second !== '00'
    )
      return report('stale or invalid billing interval');
    if (data.costAmount < budgetAmount) return report('under budget');
    if (dryRun) return report('cap reached (dry run, billing left on)');
    const info = await billingApi('GET');
    if (info.billingEnabled === false) return report('billing already disabled');
    if (info.billingEnabled !== true) throw new Error('Invalid billing response');
    await billingApi('PUT', { billingAccountName: '' });
    return report('billing disabled');
  };
}
module.exports = { createHandler };
