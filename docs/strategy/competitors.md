# Competitors: who already solves "how do my best field techs actually do it?"

Researched 2026-10-08 from public sources only. Every row is in [competitors.csv](competitors.csv) with its link. Where a source couldn't be reached or a price isn't public, it says so. **No vendor in this market publishes a price for the comparable product.** Pricing is almost entirely quote-based, and the few third-party estimates disagree with each other.

## 1. The table, most direct first

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

## 2. Price range for the comparable item

Hard prices are almost absent, so this range is weak evidence.

- **Lowest:** ~$99/user/mo (XOi, third-party listing). That's a capture tool, not analytics.
- **Median of the few dollar figures found:** about $24K–$36K/yr for a field-service AI analytics license (Aquant, modeled by CostBench, not a vendor price).
- **Highest:** $150K–$300K+/yr entry packages for enterprise process mining (Celonis, analyst benchmarks). At the platform level, Agentforce 1 Field Service is $650/user/mo, so the buyer already pays $175–$650 per technician per month for the system that holds the data.
- **Substitute floor:** $14/user/mo of Power BI plus an analyst the buyer may already employ.

→ /founder-pricing should treat ~$25K–$40K/yr per customer as the visible anchor for "AI analytics on field-service data". Everything above it needs proof.

## 3. Positioning map

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

## 4. What their customers complain about (ranked)

Review volume is thin for every niche player. Only Salesforce Field Service has enough reviews for real themes.

1. **Hard to set up, slow to pay back.** Salesforce Field Service: steep learning curve (61 reviews), setup difficulties (38), interface needs improvement (74) ([G2](https://g2.com/products/agentforce-field-service-formerly-salesforce-field-service/reviews)). Augmentir's G2 profile shows "Time to Implement 7 months" and "Return on Investment 29 months" ([G2](https://www.g2.com/products/augmentir)). Celonis year-one costs include implementation, partner services and CoE staffing outside the licence ([erpresearch](https://erpresearch.com/erp-add-ons/process-mining/celonis/pricing)). *Field-service-specific evidence is strong; the analytics-vendor evidence is thin.*
2. **The output depends on messy service data.** Aquant's one listed drawback: it "can be less effective if a company's historical service data is incomplete or inconsistent" ([G2](https://g2.com/products/aquant-service-co-pilot/reviews)). Skan: "complex workflows can require additional tuning or manual analyst work" ([RFP.wiki](https://www.rfp.wiki/it-security/process-mining-platforms/skan/mindzie)). *Thin (under 3 reviews each), but it is exactly the board's #1 risk, now confirmed from the outside.*
3. **The technician mobile experience is fragile.** Salesforce Field Service: offline sync, crashes, slow in low-signal areas; one reviewer says "the app occasionally crashes, which can slow down technicians" ([G2](https://g2.com/products/salesforce-field-service/reviews?page=68)). *Several reviews.* Any tech-facing prompt we add lives inside this pain.
4. **It costs too much for smaller teams.** Salesforce: "challenging for smaller teams to afford" ([G2](https://g2.com/products/agentforce-field-service-formerly-salesforce-field-service/reviews)). Celonis: costs "can climb to $200,000 and more when scaling" ([PeerSpot](https://www.peerspot.com/questions/what-is-your-experience-regarding-pricing-and-costs-for-celonis)). *Moderate.*
5. **Hard to navigate.** ServiceNow FSM: functions buried in deep menus ([Gartner PI](https://www.gartner.com/reviews/product/servicenow-field-service-management)). *Thin (2 reviews).*

DeepHow's 11 G2 reviews are positive (captioning, AI voiceover) and show no recurring complaint ([G2](https://www.g2.com/sellers/deephow)).

## 5. The gap

**A field-service-native analysis that ranks practices, not people, by outcome.** It shows where technicians repeatedly depart from the documented procedure and whether those jobs stick (first-time fix, no callback in 30 days) better than by-the-book jobs, with fair comparisons across technician, asset and site. It also needs to be fast to stand up on the data the customer already has.

The evidence:
- Capture tools (SightCall, CareAR, XOi, TechSee) document what experts do but don't prove it's better.
- DeepHow proves drift cost but sells only to manufacturing and pharma.
- Aquant is in field service but ranks *who* is excelling, not *which deviation from SOP* works.
- The FSM platforms hold the data but sell generic AI ("increase first-time fix rates").
- Buyers' loudest pain is implementation time and messy data. A retrospective diagnostic on existing records (the board's strongest version) answers that pain directly instead of adding to it.

**How big is the gap?** It is real but narrow. It is one analytic view that a well-resourced competitor could add. It holds only if (a) the data supports it (board C1/C2) and (b) the product builds the cross-customer deviation→outcome dataset (C7).

## 6. The threat: who copies fastest

1. **Aquant (fastest).** It already ingests historical field-service data, already sells to service leaders, and already uses "what's working" language. Adding "compare against the SOP" is a feature for it. *Watch it most closely.*
2. **Salesforce / ServiceNow / IFS.** They own the data and the tech app and already sell AI add-ons ($125/user/mo Agentforce). They're slower, because this is a niche analytic for them, but they set the buyer's price expectations. Our defence is board C8: partner or list on their marketplaces rather than fight them.
3. **DeepHow.** It has the exact concept ("process drift ... what to standardize") and could add a field-service vertical. It needs video, which field service rarely has, so this is less likely in the short term.

**Note for the board's C3 (beachhead):** this research did not size the number of buyers in any field-service vertical. That is still open for /founder-marketing and /founder-plan.
