# Docs

Project documents, grouped by category. The product's own readme is [../README.md](../README.md).

**Short on time?** Read [summary.md](summary.md) (the verdict and what to do next) or [go-to-market/one-pager.md](go-to-market/one-pager.md). [business-plan.md](business-plan.md) is the full plan with every category below stitched together. It is a snapshot from 2026-10-08, so the individual files are the ones to edit.

**Reading order:** idea → board → competitors → pricing → offer → cfo → marketing, brand and pitch → ops → launch.

## Product

| File | What it is |
|---|---|
| [product/architecture.md](product/architecture.md) | Domain boundaries, API contracts, statistical limits, Google Cloud target and production prerequisites |

## Strategy

| File | What it is |
|---|---|
| [strategy/idea.md](strategy/idea.md) | What the product is, who it is for, how it is sold |
| [strategy/board.md](strategy/board.md) | Board verdict and the conditions to meet before funding |
| [strategy/competitors.md](strategy/competitors.md) | Who already solves this, with prices where public. Rows and links are in [strategy/competitors.csv](strategy/competitors.csv) |
| [strategy/customer.json](strategy/customer.json) | Target customer profile used for the simulated buyer panel |

## Offer and pricing

| File | What it is |
|---|---|
| [offer-pricing/offer.md](offer-pricing/offer.md) | The Exception Scan offer: problem list, scored solutions, the stack, cost, value-equation scores and the buyer re-test |
| [offer-pricing/pricing.md](offer-pricing/pricing.md) | What the panel and competitors say about price, the price ladder, the opening offer, what to test and the top objections |
| [offer-pricing/pricing-curve.md](offer-pricing/pricing-curve.md) | Price sensitivity from the 100 simulated buyers |

## Finance

| File | What it is |
|---|---|
| [finance/cfo.md](finance/cfo.md) | Unit economics, year 1 month by month, what-ifs and red flags. All costs are estimates |
| [finance/cfo-sources.md](finance/cfo-sources.md) | Where every input in the numbers files came from |
| [finance/numbers.json](finance/numbers.json) | Cost-model inputs for the subscription |
| [finance/numbers-scan.json](finance/numbers-scan.json) | Cost-model inputs for the Exception Scan |

## Go-to-market

| File | What it is |
|---|---|
| [go-to-market/marketing.md](go-to-market/marketing.md) | Who to sell to first, positioning, channels, ten hooks, the 30-day campaign and budget |
| [go-to-market/brand.md](go-to-market/brand.md) | Name candidates, promise and voice, the look, and the first five touchpoints |
| [go-to-market/pitch.md](go-to-market/pitch.md) | Current pitch (the Exception Scan) |
| [go-to-market/pitch-v1.md](go-to-market/pitch-v1.md) | Original subscription pitch, kept for comparison |
| [go-to-market/one-pager.md](go-to-market/one-pager.md) | One-page pitch for the design-partner test |

## Operations

| File | What it is |
|---|---|
| [operations/ops.md](operations/ops.md) | How the design-partner Scan runs: cycle, people, routines, tools, licences and data protection, risk register |
| [operations/launch.md](operations/launch.md) | The 5-Scan test, the countdown, the launch-day run sheet and the first 30 days |

## Notes

- The finance, strategy and offer documents were written with a `/founder-*` command pipeline. If you run that pipeline again somewhere else, it may write its output to the project root instead of these folders.
- A few links point at files that are not in this repo: `panel/results.md`, `panel-offer/results.md`, `board/*.md` and `founder-board/lenses.md`. They were broken before the reorganisation and are left as they were.
