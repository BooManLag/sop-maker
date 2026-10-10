# Pricing

Inputs: [pricing-curve.md](pricing-curve.md) (100 simulated buyers), [competitors.md](../strategy/competitors.md), and [numbers.json](../finance/numbers.json) run through the CFO tool. **All costs in numbers.json are estimates until the CFO step confirms them.** The panel answers are simulated. They choose what to test and prove nothing.

## What the panel says about price

| point | annual price per region |
|---|---:|
| PMC (below this it looks too cheap to be good) | $8,170 |
| OPP (least resistance) | $8,210 |
| IPP (as many say "bargain" as say "expensive") | $19,890 |
| PME (above this too many walk away) | $44,930 |
| Median "getting expensive" | $30,000 |

The $36,000 we pitched sits **inside** the range, above the median "getting expensive" point. But price is not why people said no: 70 of the 97 passes gave **trust** as the reason, and only a few named price first. Many explicitly said price wasn't the blocker. P002: "$36k isn't the problem; one avoided callback trend pays for it." So the price does a different job here. It has to make the **first step small enough to try**, then hold the margin on the subscription.

## What competitors charge (from competitors.md)

- Aquant: no published price. The third-party *modeled* estimate is $24K–$36K/yr ([CostBench](https://www.costbench.com/compare/aquant-vs-salesforce-field-service/)).
- Salesforce Field Service: $175–$650 per user per month for the platform the buyer already pays for. The Agentforce add-on is $125 per user per month ([pricing page](https://www.salesforce.com/service/field-service-management/pricing/)). For 50 technicians, that add-on alone is $75,000/yr, so a $30K/yr analytics layer is not out of line for this buyer.
- Substitute: Power BI Pro at $14 per user per month plus an analyst the buyer already employs. That is the "my analyst can do this" objection, raised by 10 buyers.

## What the business needs (CFO tool, estimated costs)

Variable cost per region-month is an estimate of $950: compute, LLM, analyst review time and a 15% marketplace share. Fixed costs are estimated at $67,000/month.

| monthly price (= annual) | contribution per region-month | break-even (paying regions) | margin at 40 regions |
|---|---:|---:|---:|
| $1,500 ($18K/yr) | $550 (37%) | 122, above the capacity of 60 | −75% |
| $2,000 ($24K/yr) | $1,050 (52%) | 64, above capacity | −31% |
| **$2,500 ($30K/yr)** | **$1,550 (62%)** | **44** | **−5%** |
| $3,000 ($36K/yr) | $2,050 (68%) | 33 | +12% |

Below about $2,500/month, this team size cannot break even within the capacity of 60 regions. **Pricing at the panel's "least resistance" point ($8K/yr) would never pay for the team.** The low end of the range is only useful as a one-off entry diagnostic, never as the subscription price.

## 1. The price

**$30,000 a year per region or equipment line** ($2,500/month, billed annually), with a **paid entry diagnostic** in front of it.

- $30K is the panel's median "getting expensive" point. It is well under PME ($44.9K) and inside the Aquant modeled range.
- It is the lowest price that keeps break-even (44 regions) under capacity (60), at a 62% contribution.
- It is $6K below the pitched $36K. That is a deliberate trade: per the margin table, $36K gives better margins (break-even 33). We test both (below).

## 2. The ladder

| rung | what it is | price | reason to step up |
|---|---|---:|---|
| **Good: Exception Scan** | 6-week fixed-fee diagnostic on **one equipment line** from a **flat data export** the customer pulls themselves (no IT integration). Delivered: up to 5 candidate exceptions, each with sample size, effect size, confidence interval and a held-out-period check, labelled *investigate* or *validate*. Plus the methods write-up their analyst can audit. | **$12,000 one-off** | Answers the top flip requests: no IT queue, auditable method, own data, small cheque. Most "what would flip a no" answers ask for a cheap pilot on one equipment line from their own data, often under $10–15K. |
| **Better: Region subscription** | Read-only connector to the FSM, monthly refresh, a quarterly findings review with our analyst, a validation tracker (finding → controlled trial → result), and a document-control export with an audit trail. | **$30,000/yr per region** | The Scan fee is credited in full if they subscribe within 60 days. This is the rung that turns one finding into a habit. |
| **Best: Multi-region + know-how capture** | 3+ regions, plus the technician follow-up module (the opt-in "what did you do and why?" prompt, anonymised, framed as credit) and a cross-customer benchmark by equipment model (needs data-pooling consent). | **$25,000/region/yr, minimum 3 regions ($75K)** | Volume price, plus the "retirement worrier" job: capture what senior techs know. The benchmark is the board's moat condition C7. |

## 3. The opening offer

**Design-partner programme: first 5 customers, closes 31 March 2027.** The Exception Scan is **$6,000 instead of $12,000**. In return the customer gives (a) a reference call once a finding is validated, (b) case-study rights with anonymised numbers, and (c) consent to pool anonymised deviation→outcome data. This trades price for what 70% of the panel said they lack, which is references. Because it is tied to a give-back and a hard cap, it doesn't teach the market to wait for discounts. The $12,000 Scan price is the real list price from day one, not a made-up "was" price.

## 4. What to test with real buyers

1. **Subscription: $30K vs $36K per region per year.** Quote alternate prospects in the design-partner pipeline, and track how many reach procurement versus stall on price. Both prices are inside the panel range. $36K gives the better margin (break-even 33 vs 44 regions).
2. **Scan: $9,000 vs $12,000.** Run this on two versions of the outbound landing page / one-pager. Measure booked scoping calls and signed Scans per 100 qualified contacts.
3. **Guarantee wording** (for /founder-offer): "fee refunded if no finding survives the held-out check" versus "Scan fee credited only if you subscribe". This tests whether an outcome guarantee lifts Scan conversion.

## 5. The top price objections, verbatim from the panel (simulated buyers, not testimonials)

1. "That much a year for a list of things to investigate? Show me the callback savings." (P036). Variants appear in P043, P055, P090 and P094: *a list of leads is not a result*.
2. "Then I've paid $36,000 to learn what my Monday first-time-fix review already tells me." (P034). Variants: P003, P075, *paying to learn my best techs are good*.
3. "I'm paying $36K for hypotheses and then paying again in my own engineers' time to test them." (P053). Variants: P013, "$36,000 per region adds up fast across our lines".

What answers them: the Scan price (small first cheque), the held-out check (it isn't just seniority), and the validation tracker plus quarterly review (we do the follow-up work with them). /founder-offer builds these into the guarantee.
