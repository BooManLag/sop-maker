# Operations

How Good Exception (working name, see [brand.md](../go-to-market/brand.md)) runs from day one. Day one means the **design-partner Exception Scan**, delivered by people on exported data, before the connector product exists. Inputs: [idea.md](../strategy/idea.md), [offer.md](../offer-pricing/offer.md), [numbers.json](../finance/numbers.json), [numbers-scan.json](../finance/numbers-scan.json), [board.md](../strategy/board.md).

Rules differ by country and change. Every licence, data-protection and contract item below must be confirmed with the parent company's legal team or a professional. **Not legal advice.**

## 1. The cycle

This is a B2B service-plus-software business, so the rhythm is **per Scan (6 weeks)** and **per week**, not per day. Steps marked 👁 are ones the customer sees.

**One Exception Scan**

| week | step | owner |
|---|---|---|
| −1 | 👁 Scoping call → pick one equipment line → 👁 order form signed with **refund criteria written in** + DPA signed | Founder |
| −1 | 👁 Send the export spec (fields, date range, anonymisation script) | Analyst |
| 1 | 👁 Customer pulls the export → secure upload → **Readiness check** (field completeness, jobs per tech per model, callback linkage). 👁 **Go / no-go call**: stop = no charge | Analyst |
| 1 | Pre-register the analysis plan + power calculation (offer.md item L); collect the customer's **cost per truck roll** (item K, board C6) | Analyst |
| 2–4 | Map SOP steps to record fields; within-technician comparisons controlling for fault code, parts used, duration, prior callbacks; held-out period check | Data scientist |
| 5 | Internal review: every finding has n, effect, interval, held-out result; anything thin is labelled *Investigate* | Second analyst |
| 6 | 👁 Findings review (90 min) with head of service + their analyst; hand over finding cards, notebook, change-request packs, callback-$ estimate | Analyst + Founder |
| 6 | 👁 Refund decision under the written criteria; 👁 subscription proposal (Scan fee credited) | Founder |
| +4 | 👁 Check-in: which finding is in trial? (feeds the design-partner reference) | Founder |

**Every week:** Monday pipeline review (marketing.md numbers), Wednesday method review (one finding critiqued), Friday customer-data deletion audit (exports past retention are destroyed and logged).

## 2. Suppliers and inputs

None of these prices were confirmed in this run. Each is "check the published price" or "quote needed". **numbers.json is unchanged.** When real quotes arrive, update it and re-run /founder-cfo.

| input (numbers.json line) | options to contact | how to price | notes |
|---|---|---|---|
| Cloud compute + storage ($120/region-mo, est.) | AWS, Microsoft Azure, Google Cloud. **Prefer whatever the parent already has an enterprise agreement with** | Each publishes a pricing calculator (aws.amazon.com/pricing, azure.microsoft.com/pricing, cloud.google.com/pricing) | Customers may require data residency (EU/US). Pick regions to match |
| LLM usage ($80/region-mo, est.) | Anthropic Claude API, or an equivalent via the parent's cloud | Published per-token prices on the provider's pricing page | Used for parsing free-text notes. **Customer data terms (no training on their data) must pass their security review** |
| Security attestation ($40K, est.) | Compliance-automation platforms (e.g. Vanta, Drata, Secureframe) + an independent CPA audit firm for SOC 2 | Quote-based | **Check first whether the parent's existing SOC 2 / ISO 27001 scope can be extended.** That could cut this line substantially |
| Pen test (inside the $40K) | Any CREST- or similarly accredited testing firm | Quote | Needed before the connector touches customer systems, not for export-only Scans |
| FSM marketplace listing ($10K, est.) | Salesforce AppExchange, ServiceNow Store, IFS partner programme | Each publishes partner-programme and security-review terms. Read them before applying | Board C8. Subscription phase only |
| Legal templates ($15K, est.) | The parent's legal team, or outside counsel | Quote | DPA, data-pooling consent (board C7), order form with the refund clause |
| Analyst time ($75/h loaded, est.) | In-house hire (the plan), or contract data scientists for overflow | Founder to confirm the parent's loaded rates | The binding constraint on Scan volume (see People) |

**Lead times that set the launch date:** DPA and order-form templates (2–4 weeks with the parent's legal team) and the secure upload environment (1–2 weeks). These are on the critical path for /founder-launch. SOC 2 isn't needed for export-based Scans, provided the parent's security posture covers the upload.

## 3. People

The CFO assumes 4 FTE ($15K/month loaded each, an estimate). The founder must replace this with the parent's real costs. Payroll taxes and benefits vary by country, so the accountant should check them.

| role | Scan phase (months 1–6) | Subscription phase (months 7–12) |
|---|---|---|
| Product / sales lead (founder) | Selling, scoping, findings reviews: ~60% selling | Same, plus the marketplace listing |
| Data scientist | Method, analysis, held-out checks | Productising the method into the connector |
| Analyst (2nd data person) | Readiness checks, finding cards, customer analyst support | Quarterly reviews for subscribers |
| Engineer | Secure upload, anonymisation script, notebook template | Read-only FSM connector (one platform first) |

**Capacity:** a Scan is about 50 analyst/data-scientist hours (numbers-scan.json estimate). Two data people can run **about 3 Scans in parallel**, roughly 2 Scans a month. Five design partners take about **3 months**. That fits the 31 March 2027 deadline only if the first Scans start in December.

**Weekly rota (Scan phase):** Mon pipeline + readiness checks; Tue–Thu analysis blocks (no meetings before noon); Thu afternoon findings reviews; Fri method review + deletion audit.

## 4. Routines (one page each)

**R1. Starting a Scan**
1. Confirm the order form names the equipment line, the date range and the **refund criteria** (pre-set: "a finding survives" = effect in the same direction in the held-out period, with the interval excluding zero at the pre-registered level).
2. Confirm the DPA is signed. Send the export spec and the anonymisation script.
3. Open a secure upload link that expires in 7 days. Log who uploaded what, when.
4. Book the week-1 go/no-go call before hanging up.

**R2. The readiness check (week 1)**
1. Count jobs per technician per equipment model. Under the minimum in the power calculation → **stop**.
2. Check that callbacks can be linked to the original job (asset ID + 30-day window). If not → **stop**.
3. Check that at least one SOP step can be observed in a field (checklist item, part, timestamp, note keyword). If none → **stop**.
4. Write a one-page readiness note. On a stop: no invoice, data deleted within 5 working days, deletion confirmed in writing.

**R3. Reporting a finding**
1. Every finding card shows n (jobs, techs), the within-tech comparison, the interval, the held-out result and the callback-$ estimate.
2. Thin evidence → label *Investigate*, never *Improve*.
3. No technician names on any card. Tech IDs are hashed.
4. Attach the change-request pack. Never recommend changing the SOP without a controlled trial.

**R4. Handling a complaint ("the finding is wrong")**
1. Reply the same working day. Thank them and book a call.
2. Re-run the finding with them watching; show the data.
3. If it fails the written criteria → refund without argument (brand.md touchpoint 5).
4. Log the cause; fix the method; tell every affected customer what changed.

**R5. Weekly close**
1. Update the pipeline (calls booked, Scans signed, readiness pass rate).
2. Delete exports past retention and log it.
3. Track the guarantee claim rate (CFO: stays affordable under ~45%).

## 5. Tools (smallest stack)

| job | tool | why |
|---|---|---|
| CRM / pipeline | A free CRM tier (e.g. HubSpot free) or the parent's CRM | Free; the parent's CRM may already hold the warm accounts |
| Proposals / e-signature | The parent's e-signature tool | Already approved by the parent's legal team |
| Secure upload | The parent's managed file transfer, or the cloud provider's object storage with expiring links | Avoid a new vendor in the customer's security review |
| Analysis | Python + Jupyter notebooks in a private Git repository | The notebook *is* the Analyst Pack deliverable |
| Finding cards | Notebook → PDF template (brand.md type and colours) | One source of truth |
| Billing | The parent's invoicing | No new payment stack needed |

## 6. Licences, data protection, insurance (checklist, confirm each)

- [ ] **Legal entity:** run as a division of the parent or a separate entity? It affects contracts, liability and transfer pricing (ask the parent's legal and finance teams).
- [ ] **Data protection:** job records include technician identifiers, so they are **personal data** in many jurisdictions. EU/UK: GDPR / UK GDPR, which needs a DPA and possibly a DPIA, since this is analysis of employee work patterns (see ico.org.uk and the relevant EU data protection authority). US: state privacy laws (e.g. California's CCPA/CPRA, see oag.ca.gov/privacy/ccpa). **Confirm with counsel.**
- [ ] **Works councils / unions:** in some countries (e.g. Germany), analysing employee performance data can require works-council consultation. Make this a question at scoping, and an explicit "no-go" segment until handled (marketing.md drops utilities).
- [ ] **Data pooling (board C7):** explicit, opt-in contract clause; anonymised and aggregated by equipment model only.
- [ ] **Insurance:** professional indemnity / E&O (a wrong finding is the main liability) and cyber liability. Check whether the parent's policies extend to the venture.
- [ ] **Customer security questionnaires:** a standard answer pack (the parent's certifications + the venture's data flow).

## 7. Risk register

| # | risk | likelihood | impact | plan |
|---|---|:-:|:-:|---|
| 1 | **Records fail readiness** (board C2) | High | High | Week-1 stop is built in. If over 50% fail, narrow to orgs with timestamped digital checklists (marketing.md) |
| 2 | **A finding is wrong and reaches an SOP** | Medium | Very high | Pre-registered plan, held-out check, "Investigate" label, controlled-trial-only recommendation, E&O insurance |
| 3 | **No design partner signs by 15 Dec** | Medium | High | Back to /founder-offer: references are the gap; lean on the parent's accounts |
| 4 | **Customer security review stalls the export** | Medium | Medium | Anonymise-before-export script; the parent's certifications; start the review at scoping |
| 5 | **Technicians or a union object** | Medium | High | No-discipline commitment in the contract; hashed IDs; avoid unionised segments in wave 1 |
| 6 | **Key person (data scientist) leaves or is ill** | Medium | High | Method documented in notebooks; the parent's analytics team as backup; no more than 3 Scans in parallel |
| 7 | **Guarantee claim rate over 45%** | Low–Med | Medium | Track from Scan 1; tighten readiness thresholds before changing the guarantee |
| 8 | **An FSM vendor or Aquant ships "outcome by deviation"** | Medium | High | Win references and the pooled dataset first; pursue a marketplace partnership (board C8) |
| 9 | **Data breach of an export** | Low | Very high | Expiring links, encryption, 30-day retention, deletion log, cyber insurance |
| 10 | **The parent re-prioritises and pulls the team** | Medium | Very high | Agree a 6-month mandate with kill/continue criteria up front (founder-launch success lines) |

## Open questions (only the founder or a quote can answer)

- The team's real loaded cost, and what the parent absorbs (CFO's biggest lever: break-even 44 → 34 regions).
- Do the parent's SOC 2 / ISO scope, cloud agreement, CRM and legal templates extend to the venture?
- Which of the parent's customers are field-service organisations in the two first-wave segments, and on which FSM?
- Can the parent's account managers make intros, and under what incentive policy?
