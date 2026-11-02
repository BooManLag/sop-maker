# The offer: "The Exception Scan"

Built with the Offers lens (a summary of a published framework, from founder-board/lenses.md) on top of the 100-buyer panel ([panel/results.md](panel/results.md)), the competitor complaints ([competitors.md](../strategy/competitors.md)) and the cost model ([numbers.json](../finance/numbers.json), [numbers-scan.json](../finance/numbers-scan.json)). The old pitch is kept as [pitch-v1.md](../go-to-market/pitch-v1.md). The new one is [pitch.md](../go-to-market/pitch.md).

## 1. The problem list (in the buyer's words, from the panel and competitor reviews)

**Before buying**
1. "Who are you? I need references in my industry." (most common, by far)
2. "Deviators did better" is selection bias: "senior techs fix more because they're senior."
3. "Our job records are too messy to show how techs actually did the work."
4. "A list of things to investigate isn't savings. Show me the callback savings."
5. "$36k a region on a hunch / a line item I can't get past finance."
6. "My CI analyst can already slice this in Power BI."
7. "Another integration project; the last one took seven months." (G2: Augmentir lists 7 months to implement)
8. "IT security review for a tool that reads all our job records almost never clears."
9. "I buy through my FSM vendor's marketplace."
10. "Salesforce or ServiceNow will just add this."
11. "A 6–12 month buying cycle, and procurement needs an ROI case."

**During**
12. "12 weeks of setup before a single finding."
13. "My team still has to investigate, validate and roll out every finding."
14. "Techs will read it as surveillance and stop writing honest notes."
15. "Small samples per model and site, so false positives my supervisors chase for weeks."
16. "Multiple comparisons: test enough steps and something 'wins' by chance."
17. "Job-level confounders: techs go off-SOP *because* the job looked different."

**After**
18. "In a regulated shop, a deviation is something to log and justify, not celebrate."
19. "Any SOP change has to get through document control and quality sign-off with an audit trail."
20. "If it fails I've burned my credibility with the VP, again" (burned by a past AI pilot).
21. "A $30k/yr subscription after the pilot is the real decision."
22. "Know-how in senior techs' heads never reaches the records."

## 2. Solutions, scored (value to buyer 1–5, cost to deliver 1–5, where 1 = cheap)

| # | solution | answers | value | cost | keep? |
|---|---|---|:-:|:-:|---|
| A | **One-time flat export, pulled by the customer**, with no connector and no IT integration for the Scan | 7, 8, 12 | 5 | 1 | ✅ core |
| B | **Within-technician comparison** (the same tech's off-SOP vs by-the-book jobs), same equipment model and site type, plus a **held-out-period re-check** | 2, 15 | 5 | 2 | ✅ core |
| C | **Week-1 data-readiness check: stop and pay nothing** if the records can't support it | 3, 20 | 5 | 2 (20% stop-rate budgeted) | ✅ bonus |
| D | **Method + analysis notebook handed to their analyst** | 6, 16 | 4 | 1 | ✅ bonus |
| E | **Document-control-ready change request** for any finding they trial | 18, 19 | 4 | 1 | ✅ bonus |
| F | **Written no-discipline commitment**, findings anonymised at technician level | 14 | 4 | 1 | ✅ in core |
| G | **Money back if no finding survives the held-out check** | 5, 20 | 4 | 2 (15% claims budgeted) | ✅ guarantee |
| H | Scan fee **credited in full** to the subscription | 21 | 3 | 1 | ✅ |
| I | Fixed 6-week scope, first findings in week 6 (not 12) | 12 | 4 | 2 | ✅ |
| J | Design-partner price for the first 5, traded for references | 1 | 5 | 2 | ✅ urgency |
| K | Callback-$ ROI estimate before they commit | 4, 11 | 4 | 2 | ➕ v3 (see §6) |
| L | Pre-registered analysis plan + power calculation + job-level controls (fault code, parts, duration, prior callbacks) | 15, 16, 17 | 4 | 2 | ➕ v3 |
| M | Run inside the customer's own cloud tenant / anonymise before export | 8, 9 | 4 | 3 | ➕ v3, for the subscription |
| N | FSM marketplace listing | 9, 10 | 5 | 4 | Later (board C8); can't promise yet |
| O | Live references | 1 | 5 | — | **Cannot be faked.** Earned through J |
| P | Refund tied to an actual callback drop | 4, 20 | 4 | 5 (outcome lands weeks later and depends on the customer acting) | ❌ too costly and slow to verify for a 6-week Scan |
| Q | Technician follow-up prompt during the Scan | 22 | 3 | 3 | Moved to "Best" rung (pricing.md), not in the Scan |

## 3. The stack

- **The name:** *The Exception Scan*. In 6 weeks, find the off-SOP fixes your technicians already use that cut 30-day callbacks, proven on your own records.
- **The core:** a 6-week fixed scope on one equipment line from a customer-pulled export (A, B, F, I). Up to 5 findings, each with sample size, effect size and confidence interval.
- **Bonus 1: Week-1 Readiness Check (C).** It kills "our records are too messy". If they are, the customer pays nothing.
- **Bonus 2: The Analyst Pack (D).** The method and notebook. It kills "my analyst can do this" by turning the analyst into the auditor instead of the rival.
- **Bonus 3: The Change-Request Pack (E).** It kills "it'll never get through document control".
- **The guarantee (G):** if no finding survives the held-out check, the $12,000 is refunded. The refund criteria are written into the order form before the Scan starts. The re-test panel asked for this specifically: "refund criteria judged by the vendor" was a deal-breaker (offer-panel P013).
- **Real urgency (J):** 5 design-partner places at $6,000 in return for a reference call and an anonymised case study once a finding is validated. Closes 31 March 2027. Both the cap and the date are real: the cap is what the team can deliver, and the date is when the reference programme needs to be full.
- **Next step (H):** the Scan fee is credited in full to the $30,000/yr region subscription.

## 4. What it costs (CFO tool on numbers-scan.json, all estimates)

| per Scan at $12,000 | |
|---|---:|
| Analyst / data-scientist time, 50 h at $75 | −$3,750 |
| Compute + LLM | −$250 |
| Week-1 stops (20% of Scans × $12,000 not billed) | −$2,400 |
| Guarantee refunds (15% claim rate × $12,000) | −$1,800 |
| **Contribution** | **$3,800 (32%)** |

At the $6,000 design-partner price, with stop and refund costs scaled to $6,000, a Scan runs at about **−$100**, so roughly at cost. The 5 design-partner Scans fit inside the $20,000 design-partner line already in `numbers.json` startup. The guarantee is affordable **as long as the claim rate stays under about 45%**. Above that the Scan stops covering its own delivery time. Track it from Scan #1.

## 5. Value-equation scores (1–10)

| element | before (v1 pitch) | after (Exception Scan) | what moved it |
|---|:-:|:-:|---|
| Dream outcome | 6 ("a short list to investigate") | 7 ("off-SOP fixes that cut 30-day callbacks") | Name and outcome framing. Still no $ figure (K would add it) |
| Perceived likelihood | 2 | 5 | Within-tech comparison + held-out check (B), readiness check (C), auditable method (D), guarantee (G). Capped by having **no references yet** |
| Time to result | 3 (12 weeks setup + IT queue) | 6 (6 weeks, week-1 go/no-go) | Export instead of integration (A), fixed scope (I) |
| Effort and sacrifice | 3 | 6 | No IT work (A), change-request pack (E), small first cheque, fee credited (H) |

## 6. The re-test (founder-consumer, 20 buyers, same seed 876739, same customer profile)

| | v1 pitch ($36K/yr subscription) | v2 offer (Exception Scan) |
|---|---:|---:|
| Buyers | 100 | 20 |
| **Buy rate** | **3%** (3) | **20%** (4) |
| Top pass reason | trust 70% | trust 50% (10 of 20) |
| "Need" passes ("my analyst can do it") | 10% | 20% (4) |
| "Habit" passes (marketplace / IT) | 11% | 10% (2) |

**Read this carefully.** The re-test sample is 20, so every segment row is thin. The step being bought also changed, from a $36K/yr subscription to a $6K–$12K Scan. A Scan sale is not a subscription sale. Simulated buyers lean agreeable, so treat 20% as an upper bound.

**What dropped:** "12 weeks before a finding", "it's just senior techs" (several buyers said the within-tech comparison answered it), "another integration project" and "price".

**What's left, in order:**
1. **No references** (10 of 16 passes). Only design partners fix this. It is the single most important thing to earn.
2. **"The refund is statistical, not financial"** (P005, P016, P019 in the re-test). A finding that survives isn't callback dollars. → Add **K: a callback-$ estimate per finding** (avoided truck rolls × the customer's own cost per truck roll), stated before the subscription decision.
3. **Job-level confounding** (P010, P014, P018, P019): "techs go off-SOP *because* that job looked different." → Add **L: control for fault code, parts used, job duration and prior callbacks on the asset; pre-register the analysis plan and power calculation in week 1.**
4. **Data leaving the platform / client-owned data** (P001, P002, P009, P020). → Add **M: an anonymise-before-export script and an option to run in the customer's tenant.** Pursue the marketplace listing (N) for the subscription.
5. **"Let my analyst try it first"** (4 passes). Partly an endorsement of the method. Answer it with the Analyst Pack, framed as "we do the 50 hours, your analyst audits".

Who moved: building-systems heads of service (0% → 33%) and industrial OEM service directors (3% → 29%) are the beachhead. Multi-brand contractors (0/3) and regulated med/lab (0/4) didn't move. Contractors don't own the data or the SOPs, and regulated shops treat deviations as quality findings. **Drop both from the first wave** (feeds /founder-marketing).

Not re-tested: K, L and M are cheap, specific answers to the remaining objections. Fold them into the pitch before real buyers see it.
