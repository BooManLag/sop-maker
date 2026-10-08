# Successful Exceptions (working name) · Business plan

**Verdict: Not yet**

- ✓ Each region-month (one service region or equipment line on subscription) earns $1550.00 before fixed costs (62% contribution).
- ✗ Year 1 operating LOSS: $723,400.
- ✓ Break-even is 44 region-month (one service region or equipment line on subscription)s a day against a capacity of 60.
- ✗ 3 of 100 simulated buyers buy (3%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $2500.00 a region-month (one service region or equipment line on subscription) |
| Profit margin at plan | -5% per region-month (one service region or equipment line on subscription) |
| Break-even | 44 region-month (one service region or equipment line on subscription)s a day |
| Year 1 operating profit | $-723,400 |
| Startup spend | $265,000 |
| Cash needed before it pays for itself | $988,400 |
| Startup money earned back | not in year 1 |
| Buyer panel | 3 buy · 97 pass |

## The idea

- What it is: Software that finds the places where frontline field technicians have quietly invented a better way to do a job than the documented procedure, by comparing the SOP, what technicians actually did, and the job outcome, then flagging "repeated deviation + better outcome" as a candidate process improvement for humans to validate.
- Who it is for: Field service and maintenance organisations (equipment service, utilities, facilities and industrial maintenance teams) that run documented procedures and track job outcomes such as first-time-fix rate, repeat visits, callbacks, time on job and parts used. The buyer is the head of service operations or service excellence / continuous improvement; the users are technicians and their supervisors.
- What it sells, at what price: A software product (with an onboarding / pilot step) that ingests (1) the expected process (SOPs, work instructions, checklists), (2) observed executions (field-service-management job records, checklists and forms, timestamps, technician notes, photos/video where available), and (3) outcomes (first-time fix, repeat visits, callbacks, asset uptime). It detects repeated deviations, asks the technician why via a short GenAI follow-up (capturing tacit knowledge), compares outcomes between SOP-followers and deviators, and recommends controlled validation. A human approves any SOP change. Price: NOT DECIDED — to be set by /founder-pricing.
- Where and how: Online, B2B software sold to field service organisations. Delivered as SaaS that connects to the customer's existing field service management system (e.g. ServiceNow FSM, Salesforce Field Service, IFS, etc.) plus a mobile prompt for technicians. How customers find it: not yet decided.
- Budget and constraints: Being developed inside an existing company (an internal venture / new product line), not a standalone startup. Specific budget, team size and timeline not stated.

### Background the founder gave

- The core insight: companies document the process people are supposed to follow, but fail to capture how experienced employees actually get the job done. Three layers of work: documented process (what management thinks happens), actual process (what people do), and tacit knowledge (why experienced people deviate). Traditional SOP tools capture the first; process mining captures the second; this targets the third.
- The differentiated wedge: most compliance software asks "who violated the process?"; this asks "which violations produced better outcomes?" It treats drift as a source of innovation, not only non-compliance. Positioning line: "Your best employees are probably breaking your SOP. The question is whether they're wrong — or your SOP is."
- Explicitly NOT: an AI that rewrites SOPs automatically, or a tool that flags violations for discipline. Deviations are labelled "deviation detected", not "violation".
- Known competitors the founder already found: Celonis and UiPath (process mining), Skan AI (task/process observation), "Horizon-type" tribal-knowledge interview capture, and DeepHow (video-based industrial knowledge capture plus process-drift analysis that identifies skipped/reordered/repeated steps and uses outcomes to improve training — the closest). The generic "AI watches expert → finds deviation → improves SOP" version was judged not differentiated enough; the "find successful exceptions" (positive deviance) angle is what remains.
- The original examples came from manufacturing (calibration waits, supplier batches, defect rates); the founder has now chosen field service / maintenance as the first target customer.

## Summary

**Verdict: Not yet** (computed by compile.py). Two of four checks fail: **year 1 loses $723,400**, and **only 3% of simulated buyers bought** the subscription, against a 25% bar. The units are healthy and the venture isn't, yet. Three things have to change, in this order:

1. **Prove it on real records before building anything** (/founder-launch). Five paid design-partner Exception Scans at $6,000, with kill/continue lines on 28 Feb and 31 Mar 2027. This answers the board's #1 risk (the records may not show deviations) and the panel's #1 objection (no references).
2. **Bring the break-even under the plan** (/founder-cfo). At 4 FTE the break-even is 44 paying regions, above the 40-region plan. A 3-person team (or the parent absorbing a role) cuts it to 34. Pricing at $36K/yr instead of $30K cuts it to 33. Both together cut it to 26. Replace the estimated team cost with the real one first.
3. **Sell the Scan, not the subscription** (/founder-offer, done; needs real buyers). The offer re-test moved simulated buy rate from 3% to 20% (20 buyers, upper bound). That is still under the 25% bar, and the remaining blocker is references, which only the design partners can create.

**What it is:** Good Exception (working name) finds the off-SOP fixes field technicians already use that cut 30-day callbacks, comparing each technician against themselves on the customer's own job records. It is for heads of service at commercial building-systems companies and industrial equipment makers' service organisations, and is built as an internal venture of an existing company.

**The three numbers:**
- **62% contribution** per region-month ($1,550 on $2,500).
- **Break-even at 44 paying regions** (capacity 60).
- **Year 1: −$723,400** on $130,000 revenue; −$988,400 after $265,000 startup.

All costs are estimates until the founder supplies real ones.

**Where the board and the panel agreed:** the data and the proof are the risk, not the idea. The board (3× FUND IF, 4.3/10) made "back-test on real records" its first condition. 70% of panel passes were about trust: "who are you", "it's just senior techs", "a list isn't savings". **Where they disagreed:** the board's Monopoly lens feared the FSM platforms copying it most. The panel rarely raised that (a handful of "Salesforce will add it" objections). Buyers feared wasting their own credibility far more.

**Biggest risk:** field job records can't support the analysis (thin notes, pencil-whipped checklists). **What's being done:** the week-1 readiness check makes this a cheap, early, refundable discovery instead of a $180K build mistake. If 2 of the first 3 Scans fail readiness, stop.

**What the founder needs to start:** no build money yet. Five months of the existing team's time, about $20,000 to deliver design-partner Scans at cost, and legal templates from the parent. The connector build ($180K estimate) and SOC 2 ($40K estimate) wait for the 31 March 2027 result. The full year-1 case (≈$1M cash at estimated costs) is only worth asking for after that.

**This week:** brief the parent's legal team on the DPA and the order form with the written refund clause (critical path, due Tue 13 Oct). Then get the real loaded team cost and re-run /founder-cfo.

*The panel is simulated buyers and the numbers are projections. Real customers and real quotes confirm them. Not financial, legal or tax advice.*

## What the board said

**Vote: 3 FUND IF, 0 FUND, 0 PASS. Average score 4.3 / 10** (Offers 4, Monopoly 4, Product 5).

This is a unanimous "not yet, but there's something here". Nobody funds it as pitched. Nobody kills it either. All three put the same condition at the top: prove it on real field-service data before building anything.

Memos: [offers](board/offers.md) · [monopoly](board/monopoly.md) · [product](board/product.md) · [brief](board/brief.md)

### Risks raised by more than one member (these come first)

1. **The data may not show the deviation (all three, each ranked it #1 or #2).** The idea came from manufacturing, where video, desktop events and timed steps exist. In field service a job record is usually a status change, a few timestamps, parts used, a closure code and a line of free text. Skipped, reordered or added steps often never reach the FSM system. With no visible deviation, there is nothing to ask about and nothing to compare.
2. **The outcome comparison may be confounded (Monopoly, Product).** Senior technicians deviate more *and* fix more. Asset age, site, parts availability and job mix also drive first-time fix. So "deviators did better" may only mean "seniors did better". Samples per job type are small, and callbacks arrive weeks later. One wrong recommendation that reaches an SOP ends the buyer's trust.
3. **The technician prompt may fail (Offers, Product).** A tired technician gets a GenAI "why did you do X?" on a phone between jobs. It reads as surveillance whatever the label says, especially in unionised utilities and works-council countries. Low response rates mean an empty tacit-knowledge layer.
4. **No proof and no channel (Offers, Monopoly).** There are no case studies (the 7.2% vs 3.8% figure is illustrative), and "how customers find it" is not decided.

### Where the board disagrees (kept on purpose)

- **Biggest threat.** The Monopoly lens fears the platforms most: ServiceNow, Salesforce Field Service and IFS own the job data, the outcome fields, the tech app and the buyer, and could ship "outcome by deviation" as a feature. The Offers and Product lenses fear the data more than the competition. If the data can't support the claim, the platform question doesn't matter.
- **What to sell.** The Offers lens wants it sold as a money outcome (fewer callbacks and repeat visits) wrapped in a done-for-you pilot with a guarantee. The Product lens wants it cut to one thing: pick the detector, the "why" capture or the outcome proof, and drop the other two from v1.
- **Is it a business or a feature?** The Monopoly lens says that as written nothing here is 10x better than a platform add-on or a CI analyst with a BI tool. The moat only appears if the product pools deviation→outcome data across customers. The other two lenses don't make the moat a condition.
- **What field service changes.** The Monopoly lens sees field service as *better* than manufacturing because outcomes (FTF, callbacks) are already measured. The Product lens sees it as *worse* because execution is barely recorded. Both are right, and that tension is the whole bet.

### Conditions checklist (the rest of the pack ticks these off)

- [ ] **C1. Back-test on historical data first (all three).** Take 12+ months of one real customer's job and outcome records, no technician app. Find at least one repeated deviation tied to better first-time fix or fewer callbacks, and have that customer's service-excellence lead confirm it is real. *Owner: /founder-launch (the cheap real-world test), /founder-ops.*
- [ ] **C2. Prove a deviation class is visible in FSM records (Product, Offers).** Candidates: parts used vs standard kit, time on job, checklist items skipped, step order where checklists are timestamped. Bring 50 real job records. *Owner: /founder-ops, /founder-launch.*
- [ ] **C3. Narrow the beachhead (Monopoly, Product).** One vertical, one FSM platform, one equipment or job type, high volume of repeat jobs, ideally where the parent company already has relationships. Cut video, desktop capture and manufacturing examples from v1. *Owner: /founder-competitors, /founder-marketing.*
- [ ] **C4. Adjust outcomes for technician, asset and site (Product, Monopoly).** Label thin samples "investigate", never "improve". *Owner: /founder-ops (method), /founder-offer (what's promised).*
- [ ] **C5. Test the technician prompt by hand before building it (Product, Offers).** One question, after the job, opt-in, sent by a supervisor or a simple form. Measure response rate and answer quality, and decide what technicians get for answering. *Owner: /founder-launch, /founder-consumer.*
- [ ] **C6. Sell the outcome, not the method (Offers).** Put a money figure on an avoided callback or repeat visit, then build the stack: done-for-you integration, SOP import, findings review, pilot guarantee (e.g. "a validated candidate improvement within 90 days or the pilot is free"). *Owner: /founder-cfo (value per avoided callback), /founder-pricing, /founder-offer.*
- [ ] **C7. Write the moat down (Monopoly).** Get contractual rights to pool anonymised deviation→outcome data across customers (e.g. by equipment model). *Owner: /founder-ops (contracts), /founder-plan.*
- [ ] **C8. Plan for the platforms (Monopoly).** Decide what happens if an FSM vendor competes. Prefer a partnership or marketplace route over a head-on fight. *Owner: /founder-competitors, /founder-marketing.*
- [ ] **C9. Answer the distribution question (Monopoly, Offers).** How do the first 10 customers arrive and what does each cost? What does the parent company sell, to whom, and does it hold job data it may pool? *Owner: /founder-marketing, /founder-cfo.*

### Open questions the board could not answer

- How many target buyers are in the beachhead? → /founder-competitors
- Will heads of service ops pay, and will technicians answer? → /founder-consumer
- What does one avoided callback or repeat visit save, and what are CAC and payback? → /founder-cfo
- What is the price and pilot structure? → /founder-pricing
- How far does DeepHow (or an FSM vendor) already cover this in field service? → /founder-competitors

### The strongest version the board can see

This is **not** quite what was pitched. Start as a **retrospective "callback forensics" diagnostic** on data the customer already has. Sell it through the parent company's existing field-service relationships, on one FSM platform, for one equipment or job type with lots of repeat jobs. Pull 12–24 months of job records (parts, time on job, checklist items, notes) and outcomes (first-time fix, callbacks within 30 days). Adjust for technician, asset and site. Hand back a short list of "successful exceptions": places where technicians repeatedly did something off-standard and the job stuck. Each one goes to the service lead labelled "investigate". The technician "why?" prompt comes second, sent by hand and only about those specific findings, so it reads as "you found something better — tell us" rather than surveillance. Charge for the diagnostic and convert it to a subscription once the first finding is validated. Build the cross-customer deviation→outcome dataset as the moat, so the product is still worth something when the FSM vendors add drift dashboards. The pitch line stays. What changes is the order: prove it from records first, then ask people, then automate.

## The competition

Researched 2026-10-08 from public sources only. Every row is in [competitors.csv](competitors.csv) with its link. Where a source couldn't be reached or a price isn't public, it says so. **No vendor in this market publishes a price for the comparable product.** Pricing is almost entirely quote-based, and the few third-party estimates disagree with each other.

### 1. The table, most direct first

| # | Name | Type | What it sells (closest to us) | Price for the comparable item | Rating |
|---|---|---|---|---|---|
| 1 | [Aquant](https://www.aquant.ai) | Direct | AI over historical service data; Service Leaders view: "Uncover what's working, who's excelling, and where to scale" | Not published. Third-party *modeled* estimate $24K–$36K/yr ([CostBench](https://www.costbench.com/compare/aquant-vs-salesforce-field-service/)) | 4.8 G2 (4 reviews) |
| 2 | [DeepHow](https://www.deephow.com) | Direct (wrong vertical) | Process Drift Analysis: "where work changed, what it cost, and what to standardize"; Live SOP Verification; video capture | Not published (demo only) | 4.9 G2 (11) |
| 3 | [Augmentir](https://www.augmentir.ai/) | Direct (adjacent) | Connected worker; AI "productivity opportunities across processes and workforce", skill gaps | Not published | 4.4 G2 (24) |
| 4 | [Salesforce Field Service](https://www.salesforce.com/service/field-service-management/pricing/) | Indirect (platform) | The FSM that holds job + outcome data; AI add-ons | **$175–$650 /user/mo**; Agentforce add-on $125/user/mo | 4.4 G2 (979) |
| 5 | [ServiceNow FSM](https://www.gartner.com/reviews/product/servicenow-field-service-management) | Indirect (platform) | Same role on ServiceNow | Not published | 4.3 Gartner PI |
| 6 | [IFS Cloud FSM / IFS.ai](https://www.ifs.com/assets/service-management/ifs-ai-in-ifs-cloud-field-service-management) | Indirect (platform) | FSM with AI pitched at first-time fix | Not published | not found |
| 7 | [SightCall Xpert Knowledge](https://sightcall.com/solutions/field-service/) | Indirect | Turns recorded remote-support sessions into expert-reviewed guides | Not published | not found |
| 8 | [XOi Vision](https://www.capterra.com/p/174225/Vision/) | Indirect | Tech photo/video job documentation, HVAC/commercial | ~$99/user/mo (Capterra listing, unconfirmed) | see Capterra |
| 9 | [CareAR](https://carear.com/blog/intelligent-enablement-platforms/) | Indirect | AR remote assist; "every call a learning event", tribal-knowledge base | Not published | not found |
| 10 | [Celonis](https://erpresearch.com/erp-add-ons/process-mining/celonis/pricing) | Indirect | Process mining on system logs | Quote-based; estimates ~$15K/yr to $150K–$300K+ | not found |
| 11 | [Skan AI](https://www.rfp.wiki/it-security/process-mining-platforms/skan/mindzie) | Indirect | On-screen observation for desktop work | Not published (per user) | ~4.3 aggregate, low confidence |
| 12 | In-house CI analyst + BI | Substitute | Slice FTF/callbacks by tech in Power BI | [Power BI Pro $14/user/mo](https://www.microsoft.com/en-us/power-platform/products/power-bi/pricing) + analyst time | n/a |
| 13 | Ride-alongs / senior-tech councils | Substitute | Informal sharing of tricks; occasional SOP edits | Free (time) | n/a |
| 14 | Lean / Six Sigma / service consultants | Substitute | Project-based root-cause studies | Not researched | n/a |

Also seen in search but not profiled: [TechSee](https://sightcall.com/resources/why-ai-fails-in-field-service-the-blind-spot-no-one-talks-about-full/) (AR + AI, tribal knowledge), [IBM Maximo Assist](https://www.ibm.com/downloads/cas/B976J7QL), [Very FieldMind](https://www.businesswire.com/news/home/20250603317886/en) (AI assistant over a company's repair playbook, launched June 2025), and [Opero](https://marketplace.microsoft.com/en-us/product/saas/operolabsaps1779889294390.opero-field-knowledge) (Nordic industrial service). All four are knowledge-capture or assistant tools, not outcome-vs-deviation analysis.

### 2. Price range for the comparable item

Hard prices are almost absent, so this range is weak evidence.

- **Lowest:** ~$99/user/mo (XOi, third-party listing). That's a capture tool, not analytics.
- **Median of the few dollar figures found:** about $24K–$36K/yr for a field-service AI analytics license (Aquant, modeled by CostBench, not a vendor price).
- **Highest:** $150K–$300K+/yr entry packages for enterprise process mining (Celonis, analyst benchmarks). At the platform level, Agentforce 1 Field Service is $650/user/mo, so the buyer already pays $175–$650 per technician per month for the system that holds the data.
- **Substitute floor:** $14/user/mo of Power BI plus an analyst the buyer may already employ.

→ /founder-pricing should treat ~$25K–$40K/yr per customer as the visible anchor for "AI analytics on field-service data". Everything above it needs proof.

### 3. Positioning map

Axis X: **built for field service ← → built for factories / desktops**
Axis Y: **captures and documents know-how (bottom) ← → proves which practice produces better outcomes (top)**

```
                         PROVES WHICH PRACTICE WORKS
                                     ^
                                     |
        [ EMPTY: field-service       |   DeepHow (process drift +
          positive-deviance proof ]  |   "what to standardize")
                                     |
          Aquant ("who's excelling") |   Celonis / Skan (what happened,
                                     |   not whether it worked better)
                                     |   Augmentir (opportunities, skill gaps)
FIELD SERVICE <----------------------+------------------------> FACTORY / DESKTOP
                                     |
  SF / ServiceNow / IFS (hold the    |
  data; generic AI, FTF claims)      |
                                     |
  SightCall, CareAR, XOi, TechSee    |   DeepHow (video capture side)
  (capture + document expertise)     |
  Ride-alongs, tech councils         |
                                     v
                         CAPTURES / DOCUMENTS KNOW-HOW
```

The top-left quadrant is empty. Nobody found says, in field service, "this off-standard practice gets better outcomes than your SOP." The nearest is Aquant, but it ranks *people* ("who's excelling"), not *practices against the SOP*. That is our inference from its homepage wording, and a demo should confirm it.

### 4. What their customers complain about (ranked)

Review volume is thin for every niche player. Only Salesforce Field Service has enough reviews for real themes.

1. **Hard to set up, slow to pay back.** Salesforce Field Service: steep learning curve (61 reviews), setup difficulties (38), interface needs improvement (74) ([G2](https://g2.com/products/agentforce-field-service-formerly-salesforce-field-service/reviews)). Augmentir's G2 profile shows "Time to Implement 7 months" and "Return on Investment 29 months" ([G2](https://www.g2.com/products/augmentir)). Celonis year-one costs include implementation, partner services and CoE staffing outside the licence ([erpresearch](https://erpresearch.com/erp-add-ons/process-mining/celonis/pricing)). *Field-service-specific evidence is strong; the analytics-vendor evidence is thin.*
2. **The output depends on messy service data.** Aquant's one listed drawback: it "can be less effective if a company's historical service data is incomplete or inconsistent" ([G2](https://g2.com/products/aquant-service-co-pilot/reviews)). Skan: "complex workflows can require additional tuning or manual analyst work" ([RFP.wiki](https://www.rfp.wiki/it-security/process-mining-platforms/skan/mindzie)). *Thin (under 3 reviews each), but it is exactly the board's #1 risk, now confirmed from the outside.*
3. **The technician mobile experience is fragile.** Salesforce Field Service: offline sync, crashes, slow in low-signal areas; one reviewer says "the app occasionally crashes, which can slow down technicians" ([G2](https://g2.com/products/salesforce-field-service/reviews?page=68)). *Several reviews.* Any tech-facing prompt we add lives inside this pain.
4. **It costs too much for smaller teams.** Salesforce: "challenging for smaller teams to afford" ([G2](https://g2.com/products/agentforce-field-service-formerly-salesforce-field-service/reviews)). Celonis: costs "can climb to $200,000 and more when scaling" ([PeerSpot](https://www.peerspot.com/questions/what-is-your-experience-regarding-pricing-and-costs-for-celonis)). *Moderate.*
5. **Hard to navigate.** ServiceNow FSM: functions buried in deep menus ([Gartner PI](https://www.gartner.com/reviews/product/servicenow-field-service-management)). *Thin (2 reviews).*

DeepHow's 11 G2 reviews are positive (captioning, AI voiceover) and show no recurring complaint ([G2](https://www.g2.com/sellers/deephow)).

### 5. The gap

**A field-service-native analysis that ranks practices, not people, by outcome.** It shows where technicians repeatedly depart from the documented procedure and whether those jobs stick (first-time fix, no callback in 30 days) better than by-the-book jobs, with fair comparisons across technician, asset and site. It also needs to be fast to stand up on the data the customer already has.

The evidence:
- Capture tools (SightCall, CareAR, XOi, TechSee) document what experts do but don't prove it's better.
- DeepHow proves drift cost but sells only to manufacturing and pharma.
- Aquant is in field service but ranks *who* is excelling, not *which deviation from SOP* works.
- The FSM platforms hold the data but sell generic AI ("increase first-time fix rates").
- Buyers' loudest pain is implementation time and messy data. A retrospective diagnostic on existing records (the board's strongest version) answers that pain directly instead of adding to it.

**How big is the gap?** It is real but narrow. It is one analytic view that a well-resourced competitor could add. It holds only if (a) the data supports it (board C1/C2) and (b) the product builds the cross-customer deviation→outcome dataset (C7).

### 6. The threat: who copies fastest

1. **Aquant (fastest).** It already ingests historical field-service data, already sells to service leaders, and already uses "what's working" language. Adding "compare against the SOP" is a feature for it. *Watch it most closely.*
2. **Salesforce / ServiceNow / IFS.** They own the data and the tech app and already sell AI add-ons ($125/user/mo Agentforce). They're slower, because this is a niche analytic for them, but they set the buyer's price expectations. Our defence is board C8: partner or list on their marketplaces rather than fight them.
3. **DeepHow.** It has the exact concept ("process drift ... what to standardize") and could add a field-service vertical. It needs video, which field service rarely has, so this is less likely in the short term.

**Note for the board's C3 (beachhead):** this research did not size the number of buyers in any field-service vertical. That is still open for /founder-marketing and /founder-plan.

## The buyer panel

**3 buy · 97 pass** (3% buy) out of 100 simulated buyers. Seed 876739, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Service excellence lead at a medical or lab equipment service org (regulated, SOP-heavy, deviations already logged; 100 to 600 techs) | 20 | 10% |
| Director of service operations at an industrial equipment manufacturer's service org (compressors, pumps, packaging, material handling; 200 to 1,000 techs) | 35 | 3% |
| Operations lead at a third-party maintenance contractor servicing many brands (thin margins, 50 to 300 techs) | 15 | 0% |
| Head of service at a commercial building-systems service company (HVAC, elevators, fire and security; 50 to 300 techs, lots of planned maintenance) | 30 | 0% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Early adopter | 12 | 25% |
| Burned by a past AI pilot | 15 | 0% |
| Metrics-driven CI leader | 20 | 0% |
| Platform loyalist | 15 | 0% |
| Budget gatekeeper | 15 | 0% |
| Compliance-first | 8 | 0% |
| Retirement worrier | 15 | 0% |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $167,000 and up | 34 | 6% |
| $140,000 to $167,000 | 35 | 3% |
| under $140,000 | 31 | 0% |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 70 | "I already paid for one AI pilot that gave my VP a pretty dashboard and zero margin, and this sounds like the same pitch with a 12-week integration bolted on. On our thin margins I can't sign $36k a region on 'a short list of things to investigate' without seeing someone like me get real savings out of it first." (P001) · "$36k isn't the problem; one avoided callback trend pays for it. My problem is that 'deviators did better' is the classic survivorship and selection-bias trap, and a cold pitch with no named reference customer or validated method doesn't get past my inbox." (P002) |
| habit | 11 | "If it's not sold through our FSM vendor or its marketplace, I'd have to drag it through IT and security review for a tool that reads all our job records, and that almost never gets approved. On top of that, $36k a region for a list of things to go investigate is a hard sell when I can already see my first-time-fix and callback numbers every Monday." (P010) · "If it isn't sold through my FSM vendor or its marketplace, it has to go through IT security review for read access to two years of job data, and those almost never clear in a fiscal year where my VP wants margin now. Interesting idea, but I'm not spending a year and $36K a region fighting procurement for a list of things to investigate." (P022) |
| need | 10 | "My CI analyst can already pull first-time fix and callbacks by job type out of our FSM data in Power BI, so I'm not convinced this finds anything we couldn't find ourselves. Spending $36k a region on a maybe isn't how I show my VP margin this year." (P011) · "I like the idea and I'd normally jump at a pilot, but my CI analyst already slices first-time fix and callbacks in Power BI, so $36k a region is a hard sell for a short list I suspect she could mostly produce herself. And anything that needs a connector to our FSM joins IT's long queue, so 'quick to stand up' isn't real for me." (P019) |
| quality | 4 | "The retirement problem is real and the follow-up question to the tech is the part I actually like, but I'm not signing $36K off a cold pitch when I already pay a CI analyst who can cut first-time fix and callbacks by tech in Power BI. What my senior guys know mostly never makes it into the checklists or the notes field, so I doubt the job records hold it." (P016) · "I badly need to get what my senior techs know written down before they retire, but our tech notes are mostly 'replaced part, tested OK' and checklists get ticked without being read, so I don't believe there's enough in the records to show how they actually do the job. I'm not putting $36k in front of my VP on data I already know is messy." (P066) |
| convenience | 2 | "I like the idea and I'd pilot it on one region, but anything that needs a connection into our FSM goes to the back of IT's queue, and 12 weeks of setup before I see a single finding isn't the quick pilot I can just start. Paying $36K a year for a list of things to investigate, with no callback savings shown up front, isn't something I sign off on this month." (P055) · "I like the idea and $36k for one region is a pilot I could sign off on, but it needs a connector into our FSM, and that means joining IT's queue. Add 12 weeks of setup and I'm looking at most of a year before I see a finding, which isn't the quick pilot I go for." (P078) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 3 | "I lose two or three senior techs every year and what they know walks out with them; something that finds what my best people do differently, from records I already keep, is worth piloting on one region at $36k. It's read-only and no hardware, so I can sell a single-region pilot internally without a big fight." (P027) · "I lose two or three senior techs a year and what they know about fixing things first time walks out with them; something that pulls that out of the job records we already log, plus a one-question follow-up to the tech, is worth piloting on one region. At $36k for a single region with setup included, I can get that approved without a big business case." (P045) |

### What would flip a no

- Two references from contractors my size who'll tell me on the phone what callback or first-time-fix improvement they actually saw in dollars, plus a paid pilot on one equipment line with a refund if it doesn't find something worth more than it costs.
- A documented case from a comparable service org showing a finding that was piloted with a control group and measurably cut 30-day callbacks, plus a methodology write-up my analysts can audit. Or a fixed-fee or outcome-tied pilot on one equipment line using our own data.
- A short, cheap pilot on one region where they run it on our historical data first and show me two or three findings I can't explain away by tech seniority, with the price tied to measured callback reduction.
- A reference call with another third-party maintenance contractor who got a measurable first-time-fix gain, plus it being sold through our FSM platform's marketplace so it skips a separate IT review.
- Two reference calls with other third-party multi-brand maintenance contractors who saw a real drop in callbacks, plus it being listed in our FSM vendor's marketplace so IT treats it as a standard add-on instead of a new integration.
- Two reference customers in building systems with a similar FSM who can show me a measured drop in callbacks, plus a pilot where they pull the data themselves without my IT team and I only pay if the first findings review turns up something we actually act on.
- A paid pilot on one equipment line using our own history, with a written ROI showing callbacks and repeat visits we'd have avoided, plus a reference from a similar service company whose techs didn't revolt.
- Two reference customers my size, running the same FSM, who'll get on the phone and tell me which SOP they changed and what it did to first-time fix and callbacks. Plus a fixed-fee or pay-on-results pilot on one equipment line that needs nothing more from my IT team than a read-only data export.
- Two or three references from service orgs like ours (compressors, pumps, packaging) showing a measured drop in callbacks or a first-time-fix gain in dollars, plus a paid pilot on one equipment line where fees depend on hitting a defined reduction in repeat visits.
- If it showed up as an app in our FSM vendor's marketplace with their security approval already done, plus a paid pilot on one equipment line that showed a measurable drop in callbacks.
- A free or fixed-fee pilot on one equipment line, run on our own data, that turns up a deviation my analyst missed, with a measurable callback drop, and an audit trail my quality lead will sign off on.
- A paid pilot on one equipment line using our own historical records, with the fee tied to a documented drop in callbacks within 30 days, so I can show procurement ROI in our own numbers before anything renews.

Buyers say they would buy **1.0 times** in the first month on average.

100 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Inputs: [pricing-curve.md](pricing-curve.md) (100 simulated buyers), [competitors.md](competitors.md), and [numbers.json](numbers.json) run through the CFO tool. **All costs in numbers.json are estimates until the CFO step confirms them.** The panel answers are simulated. They choose what to test and prove nothing.

### What the panel says about price

| point | annual price per region |
|---|---:|
| PMC (below this it looks too cheap to be good) | $8,170 |
| OPP (least resistance) | $8,210 |
| IPP (as many say "bargain" as say "expensive") | $19,890 |
| PME (above this too many walk away) | $44,930 |
| Median "getting expensive" | $30,000 |

The $36,000 we pitched sits **inside** the range, above the median "getting expensive" point. But price is not why people said no: 70 of the 97 passes gave **trust** as the reason, and only a few named price first. Many explicitly said price wasn't the blocker. P002: "$36k isn't the problem; one avoided callback trend pays for it." So the price does a different job here. It has to make the **first step small enough to try**, then hold the margin on the subscription.

### What competitors charge (from competitors.md)

- Aquant: no published price. The third-party *modeled* estimate is $24K–$36K/yr ([CostBench](https://www.costbench.com/compare/aquant-vs-salesforce-field-service/)).
- Salesforce Field Service: $175–$650 per user per month for the platform the buyer already pays for. The Agentforce add-on is $125 per user per month ([pricing page](https://www.salesforce.com/service/field-service-management/pricing/)). For 50 technicians, that add-on alone is $75,000/yr, so a $30K/yr analytics layer is not out of line for this buyer.
- Substitute: Power BI Pro at $14 per user per month plus an analyst the buyer already employs. That is the "my analyst can do this" objection, raised by 10 buyers.

### What the business needs (CFO tool, estimated costs)

Variable cost per region-month is an estimate of $950: compute, LLM, analyst review time and a 15% marketplace share. Fixed costs are estimated at $67,000/month.

| monthly price (= annual) | contribution per region-month | break-even (paying regions) | margin at 40 regions |
|---|---:|---:|---:|
| $1,500 ($18K/yr) | $550 (37%) | 122, above the capacity of 60 | −75% |
| $2,000 ($24K/yr) | $1,050 (52%) | 64, above capacity | −31% |
| **$2,500 ($30K/yr)** | **$1,550 (62%)** | **44** | **−5%** |
| $3,000 ($36K/yr) | $2,050 (68%) | 33 | +12% |

Below about $2,500/month, this team size cannot break even within the capacity of 60 regions. **Pricing at the panel's "least resistance" point ($8K/yr) would never pay for the team.** The low end of the range is only useful as a one-off entry diagnostic, never as the subscription price.

### 1. The price

**$30,000 a year per region or equipment line** ($2,500/month, billed annually), with a **paid entry diagnostic** in front of it.

- $30K is the panel's median "getting expensive" point. It is well under PME ($44.9K) and inside the Aquant modeled range.
- It is the lowest price that keeps break-even (44 regions) under capacity (60), at a 62% contribution.
- It is $6K below the pitched $36K. That is a deliberate trade: per the margin table, $36K gives better margins (break-even 33). We test both (below).

### 2. The ladder

| rung | what it is | price | reason to step up |
|---|---|---:|---|
| **Good: Exception Scan** | 6-week fixed-fee diagnostic on **one equipment line** from a **flat data export** the customer pulls themselves (no IT integration). Delivered: up to 5 candidate exceptions, each with sample size, effect size, confidence interval and a held-out-period check, labelled *investigate* or *validate*. Plus the methods write-up their analyst can audit. | **$12,000 one-off** | Answers the top flip requests: no IT queue, auditable method, own data, small cheque. Most "what would flip a no" answers ask for a cheap pilot on one equipment line from their own data, often under $10–15K. |
| **Better: Region subscription** | Read-only connector to the FSM, monthly refresh, a quarterly findings review with our analyst, a validation tracker (finding → controlled trial → result), and a document-control export with an audit trail. | **$30,000/yr per region** | The Scan fee is credited in full if they subscribe within 60 days. This is the rung that turns one finding into a habit. |
| **Best: Multi-region + know-how capture** | 3+ regions, plus the technician follow-up module (the opt-in "what did you do and why?" prompt, anonymised, framed as credit) and a cross-customer benchmark by equipment model (needs data-pooling consent). | **$25,000/region/yr, minimum 3 regions ($75K)** | Volume price, plus the "retirement worrier" job: capture what senior techs know. The benchmark is the board's moat condition C7. |

### 3. The opening offer

**Design-partner programme: first 5 customers, closes 31 March 2027.** The Exception Scan is **$6,000 instead of $12,000**. In return the customer gives (a) a reference call once a finding is validated, (b) case-study rights with anonymised numbers, and (c) consent to pool anonymised deviation→outcome data. This trades price for what 70% of the panel said they lack, which is references. Because it is tied to a give-back and a hard cap, it doesn't teach the market to wait for discounts. The $12,000 Scan price is the real list price from day one, not a made-up "was" price.

### 4. What to test with real buyers

1. **Subscription: $30K vs $36K per region per year.** Quote alternate prospects in the design-partner pipeline, and track how many reach procurement versus stall on price. Both prices are inside the panel range. $36K gives the better margin (break-even 33 vs 44 regions).
2. **Scan: $9,000 vs $12,000.** Run this on two versions of the outbound landing page / one-pager. Measure booked scoping calls and signed Scans per 100 qualified contacts.
3. **Guarantee wording** (for /founder-offer): "fee refunded if no finding survives the held-out check" versus "Scan fee credited only if you subscribe". This tests whether an outcome guarantee lifts Scan conversion.

### 5. The top price objections, verbatim from the panel (simulated buyers, not testimonials)

1. "That much a year for a list of things to investigate? Show me the callback savings." (P036). Variants appear in P043, P055, P090 and P094: *a list of leads is not a result*.
2. "Then I've paid $36,000 to learn what my Monday first-time-fix review already tells me." (P034). Variants: P003, P075, *paying to learn my best techs are good*.
3. "I'm paying $36K for hypotheses and then paying again in my own engineers' time to test them." (P053). Variants: P013, "$36,000 per region adds up fast across our lines".

What answers them: the Scan price (small first cheque), the held-out check (it isn't just seniority), and the validation tracker plus quarterly review (we do the follow-up work with them). /founder-offer builds these into the guarantee.

## The offer

Built with the Offers lens (a summary of a published framework, from founder-board/lenses.md) on top of the 100-buyer panel ([panel/results.md](panel/results.md)), the competitor complaints ([competitors.md](competitors.md)) and the cost model ([numbers.json](numbers.json), [numbers-scan.json](numbers-scan.json)). The old pitch is kept as [pitch-v1.md](pitch-v1.md). The new one is [pitch.md](pitch.md).

### 1. The problem list (in the buyer's words, from the panel and competitor reviews)

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

### 2. Solutions, scored (value to buyer 1–5, cost to deliver 1–5, where 1 = cheap)

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

### 3. The stack

- **The name:** *The Exception Scan*. In 6 weeks, find the off-SOP fixes your technicians already use that cut 30-day callbacks, proven on your own records.
- **The core:** a 6-week fixed scope on one equipment line from a customer-pulled export (A, B, F, I). Up to 5 findings, each with sample size, effect size and confidence interval.
- **Bonus 1: Week-1 Readiness Check (C).** It kills "our records are too messy". If they are, the customer pays nothing.
- **Bonus 2: The Analyst Pack (D).** The method and notebook. It kills "my analyst can do this" by turning the analyst into the auditor instead of the rival.
- **Bonus 3: The Change-Request Pack (E).** It kills "it'll never get through document control".
- **The guarantee (G):** if no finding survives the held-out check, the $12,000 is refunded. The refund criteria are written into the order form before the Scan starts. The re-test panel asked for this specifically: "refund criteria judged by the vendor" was a deal-breaker (offer-panel P013).
- **Real urgency (J):** 5 design-partner places at $6,000 in return for a reference call and an anonymised case study once a finding is validated. Closes 31 March 2027. Both the cap and the date are real: the cap is what the team can deliver, and the date is when the reference programme needs to be full.
- **Next step (H):** the Scan fee is credited in full to the $30,000/yr region subscription.

### 4. What it costs (CFO tool on numbers-scan.json, all estimates)

| per Scan at $12,000 | |
|---|---:|
| Analyst / data-scientist time, 50 h at $75 | −$3,750 |
| Compute + LLM | −$250 |
| Week-1 stops (20% of Scans × $12,000 not billed) | −$2,400 |
| Guarantee refunds (15% claim rate × $12,000) | −$1,800 |
| **Contribution** | **$3,800 (32%)** |

At the $6,000 design-partner price, with stop and refund costs scaled to $6,000, a Scan runs at about **−$100**, so roughly at cost. The 5 design-partner Scans fit inside the $20,000 design-partner line already in `numbers.json` startup. The guarantee is affordable **as long as the claim rate stays under about 45%**. Above that the Scan stops covering its own delivery time. Track it from Scan #1.

### 5. Value-equation scores (1–10)

| element | before (v1 pitch) | after (Exception Scan) | what moved it |
|---|:-:|:-:|---|
| Dream outcome | 6 ("a short list to investigate") | 7 ("off-SOP fixes that cut 30-day callbacks") | Name and outcome framing. Still no $ figure (K would add it) |
| Perceived likelihood | 2 | 5 | Within-tech comparison + held-out check (B), readiness check (C), auditable method (D), guarantee (G). Capped by having **no references yet** |
| Time to result | 3 (12 weeks setup + IT queue) | 6 (6 weeks, week-1 go/no-go) | Export instead of integration (A), fixed scope (I) |
| Effort and sacrifice | 3 | 6 | No IT work (A), change-request pack (E), small first cheque, fee credited (H) |

### 6. The re-test (founder-consumer, 20 buyers, same seed 876739, same customer profile)

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

## The numbers

> Not financial, tax or legal advice. An accountant (and the parent company's finance team) should check the structure, transfer pricing between the venture and the parent, payroll costs and tax before money moves.

### The CFO's note

**Read this first.** Every cost below is an **estimate**. The founder has not yet supplied the team's loaded cost, how much of it the parent company absorbs, or any quoted prices. Sources and reasoning are in [cfo-sources.md](cfo-sources.md). Replace the estimates in [numbers.json](numbers.json) and re-run before anyone treats these as a budget.

**Model convention:** one unit is one *region-month* of subscription at $2,500 ($30,000/yr, from [pricing.md](pricing.md)). The tool's "per day" means "active paying regions that month". The entry Exception Scan is modelled separately in [numbers-scan.json](numbers-scan.json).

- **The margin.** Each region-month leaves **$1,550 (62%)** after its own costs: compute, LLM, analyst review time and a 15% marketplace share. Fixed costs are estimated at **$67,000/month**, mostly a 4-person team. **Break-even is 44 paying regions.** The plan of 40 regions is **below** break-even, so at plan the venture loses **5%** of revenue. Capacity is 60. Year 1 operating result: **−$723,400 on $130,000 revenue**.
- **The line to watch: team cost, then price.** The team is 90% of fixed cost. If the team is 3 people instead of 4 ($45K/month), break-even drops from **44 to 34 regions** and the margin at plan goes from **−5% to +10%**. That is a bigger swing than any price or volume what-if. The price comes next: $3,000/month ($36K/yr) moves break-even from 44 to 33.
- **Cash.** The tool reports **$988,400** needed by the end of year 1: $265,000 startup plus $723,400 operating loss. **That is not the full cash need.** The startup money is not earned back in year 1, and at the base plan of 40 regions the venture never reaches break-even. The real number depends on how fast it gets past 44 regions, so it is unbounded at base settings. With any of the fixes below, it becomes finite.
- **Three ways to improve the margin** (each is a tool what-if, not a guess):

| change | break-even (regions) | margin at plan (40) | year 1 operating |
|---|---:|---:|---:|
| Base | 44 | −5% | −$723,400 |
| 1. Leaner team: 3 FTE, $45K/mo (or parent absorbs one role) | **34** | **+10%** | −$543,400 |
| 2. Price $3,000/mo ($36K/yr, the other price under test) | **33** | **+12%** | −$697,400 |
| 3. Sell direct, not via a marketplace (no 15% share) | **37** | **+7%** | −$707,800 |
| 1 + 2 together | **26** | **+25%** | −$517,400 |
| Volume ×1.5 (60 regions, the capacity limit) | 44 | +17% | −$683,100 |

  Note the tension on 3. The panel's "platform loyalists" want a marketplace listing, and that costs the 15% share. Go direct for design partners and add the marketplace for the subscription later (board C8).

- **The Scan pays for itself, but doesn't move the venture.** At $12,000 each Scan leaves **$3,800 (32%)** after a 20% week-1 stop rate and 15% refunds (all estimated). Design-partner Scans at $6,000 run at about cost, and the 5 of them sit inside the $20,000 design-partner startup line. Even 3 list-price Scans a month adds about $11,400/month, against a $67,000 fixed base.
- **How the ramp was set.** The original panel converted 3% (an upper bound) at the subscription price. The Exception Scan re-test converted 20% (20 buyers, an upper bound) at the Scan price. Buyers described a 6–12 month procurement cycle. So the ramp assumes zero paying regions in months 1–2 (design-partner Scans only), the first conversions in month 3 and 12 regions by month 12. That is roughly 1 new region a month at first, rising to 2 a month. **There is no real conversion data yet.** /founder-launch's design-partner test is what replaces this guess.

#### Board conditions about money ([board.md](board.md))

- **C6, put a money figure on an avoided callback: NOT MET.** We still don't know any customer's cost per truck roll or repeat visit. Get it from each design partner in week 1 (offer.md item K). Without it the ROI case procurement asks for doesn't exist.
- **C9, how the first 10 customers arrive and what each costs: NOT MET.** CAC is unknown. Sales cost is buried in the team line plus $4K/month programmes. /founder-marketing must name the channel. The parent company's relationships are the cheapest channel if they exist.
- **C7, data pooling: costed.** $15,000 of legal templates is in startup.
- **Overall: the unit economics work (62–74% contribution). The venture doesn't, at this team size and scale.** Either the team shrinks or the parent absorbs part of it, the price is $36K, or the market must support well over 44 paying regions. Each is testable.

---

Every number below comes from the input file. Nothing is looked up or guessed.

### One region-month (one service region or equipment line on subscription)

| line | per region-month (one service region or equipment line on subscription) |
| --- | ---: |
| Price | $2,500.00 |
| Cloud compute + storage per region (ESTIMATE) | -$120.00 |
| LLM usage: note parsing + technician follow-ups (ESTIMATE) | -$80.00 |
| Customer analyst time: 6 h/month findings review at $75/h loaded (ESTIMATE) | -$450.00 |
| FSM marketplace revenue share, 15% of price (ESTIMATE; varies by marketplace) | -$300.00 |
| **Contribution** (what each region-month (one service region or equipment line on subscription) leaves to pay the fixed costs) | **$1,550.00** (62%) |

### The margin that matters

Fixed costs: $67,000 a month (Team: 2 engineers + 1 data scientist + 1 product/sales lead, $15k/month loaded each (ESTIMATE; parent company may absorb part) $60,000, Base cloud, tooling, security monitoring (ESTIMATE) $3,000, Sales & marketing programmes: events, content, travel (ESTIMATE) $4,000).

- **Break-even: 44 region-month (one service region or equipment line on subscription)s a day.** Below that you lose money every month.
- **Profit margin at your plan** (40 a day): **-5%** of every sale, after every cost.
- Capacity: 60 a day.

### Year 1, month by month

| month | region-month (one service region or equipment line on subscription)s a day | revenue | profit | cumulative (after $265,000 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $0 | -$67,000 | -$332,000 |
| 2 | 0 | $0 | -$67,000 | -$399,000 |
| 3 | 1 | $2,500 | -$65,450 | -$464,450 |
| 4 | 1 | $2,500 | -$65,450 | -$529,900 |
| 5 | 2 | $5,000 | -$63,900 | -$593,800 |
| 6 | 3 | $7,500 | -$62,350 | -$656,150 |
| 7 | 4 | $10,000 | -$60,800 | -$716,950 |
| 8 | 5 | $12,500 | -$59,250 | -$776,200 |
| 9 | 6 | $15,000 | -$57,700 | -$833,900 |
| 10 | 8 | $20,000 | -$54,600 | -$888,500 |
| 11 | 10 | $25,000 | -$51,500 | -$940,000 |
| 12 | 12 | $30,000 | -$48,400 | -$988,400 |

- **Year 1 operating profit: -$723,400** on $130,000 of revenue.
- After the $265,000 startup spend: -$988,400.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$988,400**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | -5% | 44 | -$723,400 |
| Price -10% | -17% | 52 | -$736,400 |
| Volume -20% | -22% | 44 | -$739,520 |
| Unit costs +15% | -11% | 48 | -$730,810 |

### Red flags

- Year 1 loses money on operations (-$723,400).
- The startup spend is not earned back within year 1.

## Marketing

Built from [panel/results.md](panel/results.md) (100 buyers, v1 pitch), [panel-offer/results.md](panel-offer/results.md) (20 buyers, Exception Scan), [competitors.md](competitors.md), [offer.md](offer.md), [pricing.md](pricing.md) and [cfo.md](cfo.md). All buyer evidence comes from simulated panels. It shows which messages to test, not what will convert. "[Name]" stands in until /founder-brand picks one.

### 1. Who first (from the evidence)

| segment | v1 buy rate (n) | Scan buy rate (n) | first wave? |
|---|---:|---:|---|
| Head of service, commercial building systems (HVAC, elevators, fire/security) | 0% (30) | 33% (6) | **Yes** |
| Director of service ops, industrial equipment maker's service org | 3% (35) | 29% (7) | **Yes** |
| Service excellence lead, regulated medical/lab equipment | 10% (20) | 0% (4) | Not yet: deviations are quality findings; needs a compliance-grade version |
| Ops lead, multi-brand maintenance contractor | 0% (15) | 0% (3) | No: doesn't own the data or the SOPs (offer-panel P001) |

By behaviour: **early adopters** (25% → 100%, thin) and **retirement worriers** are the warmest. Burned-by-AI, platform loyalists and budget gatekeepers stayed at 0%. Don't spend on them until references exist.

### 2. Positioning

Three versions:

1. **The callback angle:** *For heads of service at building-systems and equipment service organisations, who see callbacks every Monday but can't see why some fixes stick, [Name] is the Exception Scan that finds the off-SOP fixes your own technicians already use that cut 30-day callbacks, proven within each technician on your own records, unlike FSM dashboards that rank who's fastest or knowledge tools that record what experts say.*
2. **The retirement angle:** *For service leaders losing senior techs every year, [Name] finds what your best technicians do differently that actually works, from the records you already keep, before they retire.*
3. **The SOP-is-wrong angle:** *Your best technicians are probably breaking your SOP. [Name] tells you when they're right.*

**Recommend #1.** It names the metric buyers already review weekly ("you review first-time-fix and callback numbers every Monday" was the habit most cited by buyers) and the gap in competitors.md (nobody ranks *practices against the SOP* by outcome in field service). "Within each technician" answers the most-repeated objection (P002, P008, P075: "it'll just be senior techs"). The re-test showed that phrase working: offer-panel P002, P017 and P019 said it answered their doubt.

##2 is the best **hook** for the retirement worriers but a weaker position. Two passing buyers said know-how "never makes it into the records" (P016, P066). Use it in content, not as the headline. #3 is the founder's line. It is great for attention and risky with compliance-first buyers (P028, P046: "a deviation is a deviation"). Keep it for talks and posts, never for regulated prospects.

**How not to sound like competitors:** don't say "AI-powered frontline intelligence" (Augmentir), "physical AI" (DeepHow) or "conversational AI" (Aquant). Lead with the callback metric and the method, not the AI.

### 3. Channels

| channel | why it fits | rough cost | how you'll know | start? |
|---|---|---|---|---|
| **Parent company's existing accounts** (warm intros from account managers) | Kills objection #1 ("who are you?") with a known logo. Board C3/C9 say start where relationships exist | Staff time only; maybe a referral SPIFF | Intro meetings booked per account manager per month | **Yes, #1** |
| **Founder-led LinkedIn**: posts + direct messages to heads of service in the two segments | This is where service directors and CI leaders are reachable by title. Posts can carry the method (within-tech comparison, held-out check) that the CI-leader segment demands | $0 organic; ~$100/mo for Sales Navigator (check current price) | Replies and booked scoping calls per 100 DMs | **Yes, #2** |
| **One field-service industry event or community** (e.g. a Field Service conference, Service Council, TSIA, or the FSM vendor's user group) | The audience is concentrated there, and a talk on "when your techs are right and your SOP is wrong" fits the format | $3K–$15K per event plus travel (check each organiser's published rates) | Scoping calls per event | **Yes, #3**: pick one, Q1 2027 |
| FSM marketplace listing | Platform loyalists (11–15% of buyers) only buy here | Listing fee + review + revenue share (CFO: 15% assumed) | — | **Later**: subscription phase (board C8) |
| Paid search | Nobody searches "positive deviance field service". Low intent volume | — | — | **No** |
| Paid social / display | Cold, trust-starved audience; ads can't create references | — | — | **No** |
| Cold email at volume | The panel's burned-by-AI buyers "ignore most" vendor emails (a customer.json habit) | — | — | **No**, except personal, 1:1 follow-ups |

### 4. Ten hooks (each answers one panel objection)

| # | hook | format | answers |
|---|---|---|---|
| 1 | "Your techs are already fixing your callback rate. Some of them just aren't following the SOP to do it." | LinkedIn post opener | the core idea |
| 2 | "We compare each tech against *themselves*. Seniority can't explain the result." | Post / one-pager headline | "it's just senior techs" (P002, P008, P075) |
| 3 | "Week 1: we check your records. If they can't support it, we stop and you pay nothing." | DM line / one-pager | "our records are too messy" (P020, P030, P082) |
| 4 | "No connector. No IT ticket. Your team pulls one export." | DM opener | "another integration project / IT queue" (P045, P055, P078) |
| 5 | "If nothing survives the held-out check, you get the fee back. The criteria are in writing before we start." | One-pager / proposal | "a list of leads isn't a result" (P043, P055) + offer-panel P013 |
| 6 | "Your analyst gets the notebook. We do the 50 hours; they audit it." | DM to CI leaders | "my analyst can do this in Power BI" (P011, P019, P023) |
| 7 | "Every finding comes with a change request your document control can file." | One-pager | "it'll never get through quality sign-off" (P068, P080) |
| 8 | "Anonymised by technician. Written: never used for discipline." | One-pager / talk slide | "techs will see it as surveillance" (P057, P060, P096) |
| 9 | "Before your senior techs retire, find out which of their workarounds actually work." | Post opener (retirement worriers) | buy reason (P027, P045, P099) |
| 10 | "We're looking for 5 service teams to be first. You get the Scan at half price; we earn a reference." | DM / post | "who are you / no references" (honest version) |

### 5. The 30-day campaign

**Launch day = Monday 16 November 2026:** the design-partner programme opens publicly. It closes 31 March 2027 or at 5 partners, whichever comes first (from pricing.md). The Scan is delivered by the analyst team on exported data, so it can launch before the MVP connector exists. Owners: **F** = founder/product-sales lead, **A** = analyst/data scientist, **P** = parent-company account managers.

| date | channel | what goes out | owner |
|---|---|---|---|
| Mon 2 Nov | Internal | Brief the parent's account managers: the one-pager, hooks 2–5, who to introduce (two segments only) | F |
| Tue 3 Nov | LinkedIn | Founder profile rewritten around positioning #1. Post 1: hook 1 + the three-layer idea (documented / actual / why) | F |
| Wed 4 Nov | — | Build a list of 150 named heads of service in the two segments (LinkedIn), 25 in the parent's accounts | F |
| Thu 5 Nov | LinkedIn | Post 2: hook 9, "the Gerald problem" (a 23-year tech retires and takes the workaround with him) | F |
| Mon 9 Nov | LinkedIn | Post 3: hook 2, the within-technician method explained in 5 lines with a simple diagram | F + A |
| Tue 10 Nov | Warm intros | Account managers send the first 10 intro emails (template from hook 10 + one-pager) | P |
| Wed 11 Nov | LinkedIn DMs | First 25 personal DMs: hook 4 + hook 3. No attachment, ask for a 20-minute call | F |
| Thu 12 Nov | LinkedIn | Post 4: hook 8, how we keep it from becoming surveillance (the written commitment, in full) | F |
| **Mon 16 Nov** | LinkedIn + intros | **Launch post:** "Design-partner programme open: 5 places, $6,000 Scan, closes 31 March 2027", with hook 10 and what partners give (reference + anonymised case) | F |
| Tue 17 Nov | Warm intros | Next 10 intros from account managers | P |
| Wed 18 Nov | DMs | 25 DMs (hooks 5 + 6, for CI leaders) | F |
| Thu 19 Nov | LinkedIn | Post 5: a sample (synthetic, clearly labelled) finding card: sample size, effect size, CI, held-out result | A |
| Mon 23 Nov | DMs | 25 DMs + follow-ups to the 2 Nov–11 Nov list | F |
| Tue 24 Nov | LinkedIn | Post 6: hook 7, what the document-control change request looks like | F |
| Wed 25 Nov | — | Week-2 review (see numbers below). Rewrite the weakest hook | F |
| Mon 30 Nov | LinkedIn | Post 7: hook 6, "your analyst audits us", with the notebook outline | A |
| Tue 1 Dec | DMs + intros | 25 DMs; account-manager follow-ups on silent intros | F + P |
| Wed 2 Dec | LinkedIn | Post 8: behind the scenes, what the week-1 readiness check looks at (the fields, the thresholds) | A |

**Nothing new to say?** Post from the work itself: a field we found unusable and why; how we handle a tech who covers several equipment models; why we won't report a finding under N jobs. Process posts like these are what the CI-leader segment trusts.

**Not before 16 Nov:** any price in public, any customer name, any result. There are none yet.

### 6. Budget and numbers

**Budget (from the CFO's $4,000/month programmes line, months 1–2):**

| item | per month |
|---|---:|
| LinkedIn Sales Navigator for the founder (check current price) | ~$100 |
| One-pager, finding-card and diagram design (one-off, spread) | ~$1,000 |
| Account-manager referral incentive (parent's policy permitting) | ~$1,000 |
| Reserve for one Q1 2027 event (accrue) | ~$1,900 |
| **Total** | **$4,000** |

**The most you can pay to win a customer** (CFO numbers; lifetime is an **assumption**):

- Contribution per region-month: $1,550 → **$18,600 per region per year**.
- Plus the Scan contribution at list: **$3,800** (≈$0 for the 5 design partners).
- Assume a 2-year average first term (not evidenced, since there's no churn data yet). Lifetime contribution ≈ **$37,200 + $3,800 = $41,000** per converted region.
- Keep acquisition cost under one-third of that: **≈$13,700 per converted region**. That includes the founder's selling time, which today sits inside the team line, so track hours.

**Three numbers to watch weekly:**

| number | change something if… |
|---|---|
| **Scoping calls booked** (intros + DMs) | under 3 a week by 30 Nov → rewrite the hooks; move effort to the parent's accounts |
| **Scans signed** (design-partner or list) | 0 by 15 Dec → go back to /founder-offer (references? guarantee wording? price?) |
| **Week-1 readiness pass rate** | under 50% of Scans pass → the records problem (board C2) is real. Narrow to orgs with timestamped digital checklists before selling more |

## Brand

Brief from [marketing.md](marketing.md): position on the **callback metric + method**, not on "AI". The first audience is heads of service in building systems and directors of service ops at industrial equipment makers. Competitors' language to stay clear of ([competitors.md](competitors.md)): "physical AI" (DeepHow), "AI-native platform for the industrial frontline" (Augmentir), "conversational AI" (Aquant). Panel reasons people buy: "find what my best people do differently", "from records I already keep" (P027, P045, P099).

### 1. Ten name candidates

`.com` status was checked on 2026-10-08 against the public Verisign RDAP registry. "Registered" means someone owns it, not necessarily a competitor.

| # | name | style | what it says / how it sounds | .com | risk |
|---|---|---|---|---|---|
| 1 | **Good Exception** | descriptive-evocative | The whole thesis in two words: some exceptions are good. Easy to say on a call | goodexception.com **free** | Weak to trademark (descriptive). "Exception" means *error* to software people |
| 2 | **Knackfield** | invented compound | "Knack": a skill that's hard to explain (tacit know-how). "Field": field service. Warm, human | knackfield.com **free** | Knack (knack.com) is a software company: confusion check in class 42 |
| 3 | **Tacitfield** | invented compound | Tacit knowledge, in the field. Precise to CI leaders, opaque to others | tacitfield.com **free** | Sounds academic. "Tacit" is hard for non-native speakers |
| 4 | Holdout | evocative (statistics) | Names the held-out check, the proof step | holdout.com registered; holdoutscan.com free | Also means a labour holdout, the wrong association with unions |
| 5 | Fix That Stuck | descriptive phrase | Plain-English outcome (no callback) | fixthatstuck.com free | Too long for an app icon; reads like a slogan |
| 6 | SOP Gap | descriptive | The gap between the documented and the actual process | sopgap.com free | Sounds like a compliance audit tool, the opposite of the positioning |
| 7 | Fieldtell | invented | The field tells you what works | fieldtell.com free | Says little; "tell" could read as surveillance |
| 8 | Bright Spot | evocative (positive deviance) | The classic term for positive outliers | brightspot.com registered | Crowded phrase, likely existing marks |
| 9 | Workaround | evocative | Candid, memorable | workaround.com registered | Implies hacks, and compliance buyers hate it |
| 10 | Gerald | founder's in-joke ("Gerald was the API") | Memorable story | not checked | A person's name, odd for B2B; the joke needs explaining |

**Shortlist: Good Exception · Knackfield · Tacitfield.**

**Recommend: Good Exception**, with the product called **the Exception Scan**. The name *is* the founder's best line ("your best employees are probably breaking your SOP; the question is whether they're right") in two words. It pairs naturally with the product name, and its domain is free. The descriptive-mark weakness is real. If a trademark lawyer says it can't be protected, **Knackfield** is the fallback: more ownable and warmer, after the class 42 confusion check against Knack.

#### Checks you must finish yourself

I can only run public lookups. A trademark lawyer confirms registrability, and nothing is yours until you register it.

- **Trademark.** Search each name in **class 9** (downloadable software), **class 42** (SaaS / software as a service) and **class 35** (business analysis and consulting):
  - US: USPTO Trademark Search, https://tmsearch.uspto.gov/
  - EU: EUIPO eSearch, https://euipo.europa.eu/eSearch/
  - UK: UKIPO, https://trademarks.ipo.gov.uk/ipo-tmtext
  - Canada: CIPO, https://ised-isde.canada.ca/cipo/trademark-search/srch
- **Domain.** goodexception.com, knackfield.com and tacitfield.com were unregistered on 2026-10-08. They can be taken any day, so register the winner as soon as it is chosen. Check country domains for your markets too.
- **Handles.** Check LinkedIn company page, X, YouTube (and Instagram/TikTok only if used). LinkedIn matters most for this buyer.
- **Confusion.** None of the three is close to Aquant, DeepHow, Augmentir, SightCall, CareAR, XOi, Celonis or Skan. Knackfield needs the Knack check above.
- **Parent company.** Check whether the parent's brand guidelines require endorsed naming (e.g. "Good Exception, from <Parent>"). The panel says a known parent logo would help with trust (objection #1).

### 2. Promise, tagline, voice

**The one-line promise:** *We only show you an exception when it holds up in your own data, and we show you why.*

**Tagline options:**
1. **"Some exceptions are good. We find them."** (recommended; it pairs with the name)
2. "Your techs already found a better way. We prove which ones."
3. "Fewer callbacks, from the fixes your team already uses."

**Voice: three adjectives.**

| adjective | do | don't |
|---|---|---|
| **Evidence-first** | Give the n, the effect and the interval. Say "investigate" when it's thin | Say "AI-powered insights", "unlock", "revolutionise" |
| **On the tech's side** | Credit the technician who found the better way; anonymise by default | Say "violation", "non-compliance", "catch", "monitor" |
| **Plain-spoken** | Write like a service director talks: callbacks, truck rolls, first-time fix | Write like a dashboard: "leverage frontline intelligence" |

**Before / after** (a line from the v1 pitch):

- *Before:* "It finds the places where your technicians repeatedly do the job differently from your SOP, and checks whether those jobs stick better than by-the-book ones, adjusted for technician, asset and site."
- *After:* "Some of your techs skip a step, or add one, and their fixes stick. We compare each tech against themselves, so it isn't just experience, and we tell you which ones are worth a trial."

### 3. The look (brief)

**Colour.** WCAG ratios computed for each pair.

| role | hex | job | contrast |
|---|---|---|---|
| Ink navy | `#14213D` | Text, logo, primary buttons | 14.7:1 on Paper ✅ AAA; white on Ink 16.0:1 ✅ |
| Kept green | `#1F7A5A` | "The fix stuck": positive outcome, links | 4.8:1 on Paper ✅ AA (normal text); white on green 5.3:1 ✅ AA |
| Signal amber | `#F2A541` | The exception highlight: fills, chart markers, the logo's offset mark | **1.9:1 on Paper ✗**: never use it for text on light backgrounds. Ink text on amber 7.8:1 ✅ |
| Paper | `#F7F5F0` | Background (warm, report-like, not dashboard-black) | — |
| Slate (secondary text) | `#5C6475` | Captions, axis labels | 5.5:1 on Paper ✅ AA |

**Type** (both free under the SIL Open Font License, from Google Fonts: https://fonts.google.com):
- **Display: Space Grotesk.** Engineered and slightly quirky, which fits "the exception".
- **Text and numbers: IBM Plex Sans + IBM Plex Mono** (for n, effect sizes and intervals in finding cards).

**Logo brief:**
- **It must say:** a standard line with one step out of place, and it's the good one. For example, a row of identical marks with one offset in amber.
- **It must work** as a 32 px favicon/app icon, a LinkedIn avatar, the header of a PDF finding card, and one-colour on a dark slide.
- **Avoid:** eyes, cameras or magnifying glasses (surveillance), robots and sparkles (generic AI), checkmarks (compliance tooling).
- If you have an image tool connected, I can generate rough concepts. They would be **concepts only**, not a finished logo. A designer finishes it.

### 4. The first five touchpoints

1. **The one-pager / homepage hero.** Headline: "Some exceptions are good. We find them." Subline: positioning #1 from marketing.md. Then three proof lines (hooks 2, 3, 5) and one button: "Book a 20-minute scoping call". No stock photos of technicians looking at tablets.
2. **The finding card (the "packaging").** One page per finding: the practice in plain words, n jobs, callback rate off-SOP vs on-SOP *within the same techs*, the interval, the held-out result, the label (Investigate / Ready to trial), and the attached change request. This is the product's most-shared artefact, so design it first.
3. **The order-form confirmation.** It restates the refund criteria in writing (offer.md: criteria set before start), the week-1 stop rule and the no-discipline commitment, and names the analyst on the account.
4. **The first LinkedIn post** (3 Nov, marketing.md): the three-layer idea. Documented process, actual process, and the *why*. Written in the founder's voice, no logo-heavy graphic.
5. **The reply to the first complaint**, e.g. "your finding was wrong". Template: thank them; show the data behind it; if the held-out check was borderline, say so; offer the refund under the written criteria without argument; publish what changed in the method. Evidence-first, on their side, plain.

## Operations

How Good Exception (working name, see [brand.md](brand.md)) runs from day one. Day one means the **design-partner Exception Scan**, delivered by people on exported data, before the connector product exists. Inputs: [idea.md](idea.md), [offer.md](offer.md), [numbers.json](numbers.json), [numbers-scan.json](numbers-scan.json), [board.md](board.md).

Rules differ by country and change. Every licence, data-protection and contract item below must be confirmed with the parent company's legal team or a professional. **Not legal advice.**

### 1. The cycle

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

### 2. Suppliers and inputs

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

### 3. People

The CFO assumes 4 FTE ($15K/month loaded each, an estimate). The founder must replace this with the parent's real costs. Payroll taxes and benefits vary by country, so the accountant should check them.

| role | Scan phase (months 1–6) | Subscription phase (months 7–12) |
|---|---|---|
| Product / sales lead (founder) | Selling, scoping, findings reviews: ~60% selling | Same, plus the marketplace listing |
| Data scientist | Method, analysis, held-out checks | Productising the method into the connector |
| Analyst (2nd data person) | Readiness checks, finding cards, customer analyst support | Quarterly reviews for subscribers |
| Engineer | Secure upload, anonymisation script, notebook template | Read-only FSM connector (one platform first) |

**Capacity:** a Scan is about 50 analyst/data-scientist hours (numbers-scan.json estimate). Two data people can run **about 3 Scans in parallel**, roughly 2 Scans a month. Five design partners take about **3 months**. That fits the 31 March 2027 deadline only if the first Scans start in December.

**Weekly rota (Scan phase):** Mon pipeline + readiness checks; Tue–Thu analysis blocks (no meetings before noon); Thu afternoon findings reviews; Fri method review + deletion audit.

### 4. Routines (one page each)

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

### 5. Tools (smallest stack)

| job | tool | why |
|---|---|---|
| CRM / pipeline | A free CRM tier (e.g. HubSpot free) or the parent's CRM | Free; the parent's CRM may already hold the warm accounts |
| Proposals / e-signature | The parent's e-signature tool | Already approved by the parent's legal team |
| Secure upload | The parent's managed file transfer, or the cloud provider's object storage with expiring links | Avoid a new vendor in the customer's security review |
| Analysis | Python + Jupyter notebooks in a private Git repository | The notebook *is* the Analyst Pack deliverable |
| Finding cards | Notebook → PDF template (brand.md type and colours) | One source of truth |
| Billing | The parent's invoicing | No new payment stack needed |

### 6. Licences, data protection, insurance (checklist, confirm each)

- [ ] **Legal entity:** run as a division of the parent or a separate entity? It affects contracts, liability and transfer pricing (ask the parent's legal and finance teams).
- [ ] **Data protection:** job records include technician identifiers, so they are **personal data** in many jurisdictions. EU/UK: GDPR / UK GDPR, which needs a DPA and possibly a DPIA, since this is analysis of employee work patterns (see ico.org.uk and the relevant EU data protection authority). US: state privacy laws (e.g. California's CCPA/CPRA, see oag.ca.gov/privacy/ccpa). **Confirm with counsel.**
- [ ] **Works councils / unions:** in some countries (e.g. Germany), analysing employee performance data can require works-council consultation. Make this a question at scoping, and an explicit "no-go" segment until handled (marketing.md drops utilities).
- [ ] **Data pooling (board C7):** explicit, opt-in contract clause; anonymised and aggregated by equipment model only.
- [ ] **Insurance:** professional indemnity / E&O (a wrong finding is the main liability) and cyber liability. Check whether the parent's policies extend to the venture.
- [ ] **Customer security questionnaires:** a standard answer pack (the parent's certifications + the venture's data flow).

### 7. Risk register

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

### Open questions (only the founder or a quote can answer)

- The team's real loaded cost, and what the parent absorbs (CFO's biggest lever: break-even 44 → 34 regions).
- Do the parent's SOC 2 / ISO scope, cloud agreement, CRM and legal templates extend to the venture?
- Which of the parent's customers are field-service organisations in the two first-wave segments, and on which FSM?
- Can the parent's account managers make intros, and under what incentive policy?

## Launch plan

Today is **Thursday 8 October 2026**. **Launch is Monday 16 November 2026**: the Exception Scan design-partner programme opens. That is the earliest realistic date, given the 2–4 week legal-template lead time and the 1–2 week secure-upload setup in [ops.md](ops.md). The launch *is* the cheap real-world test. No connector product gets built (the $180K MVP line in numbers.json) until real buyers pass the success lines below.

Owners: **F** = founder / product-sales lead · **DS** = data scientist · **AN** = analyst · **EN** = engineer · **PL** = parent's legal team · **PA** = parent's account managers · **SP** = executive sponsor at the parent.

### 1. The test: 5 paid design-partner Scans before any build spend

A service business tests with paid pilots at the real price. Here that means the Exception Scan at the design-partner price of $6,000, with real money, real data and real findings.

**Success lines, written before the test:**

| by | line | panel said | if we miss it |
|---|---|---|---|
| 15 Dec 2026 | **12+ scoping calls** with first-wave prospects (building systems + industrial OEM service) | — | Rewrite the hooks, lean harder on PA intros (marketing.md) |
| 31 Jan 2027 | **3+ Scans signed and paid** at $6,000 | The re-test buy rate was 20% of buyers shown the offer (upper bound). Expect real conversion from scoping call to Scan of about 10–25% | Under 2 → back to /founder-offer: references and the refund-on-statistics objection |
| 28 Feb 2027 | **2 of the first 3 pass the week-1 readiness check** | Board C1/C2: the data may not show deviations | Under 2 → the core risk is real. Narrow to orgs with timestamped digital checklists, or **stop** |
| 31 Mar 2027 | **1+ finding survives the held-out check and the customer's head of service agrees it is real** (board C1) | — | 0 → the method doesn't work on field records. **Stop or pivot** before spending the $180K build |
| 30 Apr 2027 | **1+ design partner commits to the $30K/yr subscription**, or a paid trial of a finding is running with a callback-$ target | CFO ramp assumes the first paying region in month 3 | 0 → the Scan may be a consulting product, not a SaaS. Re-run /founder-cfo as a services business |

**Real buyers win.** If the real numbers fall well short of the simulated panel, trust the real buyers and go back to /founder-offer or /founder-pricing. Don't argue with the market using the panel.

**Kill / continue (agree it with the SP now, ops.md risk 10):** pass the 28 Feb and 31 Mar lines → fund the connector build. Miss either → stop, with the total spend capped at the design-partner budget plus 5 months of team time.

### 2. The countdown

**Critical path (★):** anything that slips here moves 16 Nov. That is legal templates → order form with refund clause → secure upload → readiness-check script → first scoping calls.

| week of | task | owner | deadline |
|---|---|---|---|
| **12 Oct** | ★ Brief PL: DPA, order form with the written refund clause, data-pooling consent (board C7) | F | Tue 13 Oct |
| | Agree the 6-month mandate and kill/continue lines with the sponsor | F + SP | Fri 16 Oct |
| | Get the real loaded team cost and what the parent absorbs → update numbers.json → re-run /founder-cfo | F | Fri 16 Oct |
| | List the parent's field-service accounts in the two first-wave segments, and their FSM platforms | F + PA | Fri 16 Oct |
| | Choose the name; run trademark searches (classes 9, 35, 42); register the domain the same day (brand.md) | F | Fri 16 Oct |
| **19 Oct** | ★ Secure upload environment with expiring links + deletion log | EN | Fri 23 Oct |
| | ★ Anonymisation script (hash tech IDs before export) + export spec for Salesforce FS / ServiceNow / IFS | EN + AN | Fri 23 Oct |
| | Pre-registered analysis-plan template + power calculation (offer.md item L) | DS | Fri 23 Oct |
| | Logo concept + finding-card template + one-pager (brand.md) | F (+ designer) | Fri 23 Oct |
| **26 Oct** | ★ Readiness-check script (ops.md R2) tested on a synthetic or friendly dataset | DS + AN | Wed 28 Oct |
| | **Dry run (soft open):** a full mini-Scan on a friendly dataset (a parent business unit, a friendly account, or a public/synthetic set). Time each step against the 50-hour estimate | DS + AN | Fri 30 Oct |
| | ★ PL returns DPA + order form | PL | Fri 30 Oct |
| **2 Nov** | Marketing calendar starts (launch −14): PA briefing, LinkedIn profile, posts 1–2, prospect list of 150 | F | per marketing.md |
| | Customer security-questionnaire answer pack (ops.md §6) | EN + F | Fri 6 Nov |
| | Confirm data-protection position (personal data, DPIA, works-council question at scoping) with PL | F + PL | Fri 6 Nov |
| **9 Nov** | First intros (PA) + first 25 DMs; posts 3–4 | F + PA | per marketing.md |
| | Rehearse the scoping call and the week-6 findings review on the dry-run output | F + DS | Fri 13 Nov |
| **16 Nov** | **LAUNCH**: programme opens (run sheet below) | all | Mon 16 Nov |

### 3. Launch day run sheet: Monday 16 November 2026

| time | what | who | if something breaks |
|---|---|---|---|
| 08:30 | Stand-up: check the one-pager link, booking link, order form and upload environment | all | Booking link down → put a direct email in the post |
| 09:00 | Launch post on LinkedIn (hook 10 + programme terms + closing date) | F | — |
| 09:15 | Team and sponsor reshare; PA sends the launch note to warm accounts | SP + PA | — |
| 10:00–12:00 | Personal follow-ups to everyone who replied to posts 1–4 | F | — |
| 12:00 | Check: post reach, replies, booking-link clicks | F | Zero replies by noon is normal for B2B. Don't boost with ads |
| 13:00–16:00 | Scoping calls already booked from the 9–13 Nov DMs | F + AN | A prospect asks for references → be honest: "You'd be one of the first five; that's why it's $6,000 and refundable" |
| 16:00 | 25 new DMs (hooks 5 + 6) | F | — |
| 17:00 | Log the day's numbers; one-line note to SP | F | — |

### 4. The first 30 days (16 Nov – 16 Dec)

**Track weekly** (from the CFO and marketing.md):

| number | target by 16 Dec | trigger to change something |
|---|---|---|
| Scoping calls booked | 12 | under 3 a week by 30 Nov → rewrite hooks; shift to PA intros |
| Scans signed | 2 | 0 by 15 Dec → /founder-offer |
| Readiness pass rate (once Scans start) | ≥ 50% | under 50% → narrow the segment (ops.md risk 1) |
| Paying regions vs break-even (CFO: 44) | 0 (expected: subscriptions start month 3+) | — this matters from Feb 2027 |
| Selling hours per signed Scan | track | over 40 h/Scan → acquisition cost heading past the ~$13.7K ceiling (marketing.md) |

**Reviews:**
- **Day 7 (Mon 23 Nov):** Which hook got replies? What did prospects ask that the one-pager doesn't answer? Is any objection new (not in panel/results.md)?
- **Day 14 (Mon 30 Nov):** Are we on track for 12 calls? What do real prospects say about price, references and data? How does that compare with the simulated panel? Where it differs, believe the prospects.
- **Day 30 (Wed 16 Dec):** Scans signed vs 2. First readiness result, if any. Decide: continue as planned, change the offer, or change the segment. Report to SP against the kill/continue lines.

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
