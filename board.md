# Board verdict: Successful Exceptions (working name)

**Vote: 3 FUND IF, 0 FUND, 0 PASS. Average score 4.3 / 10** (Offers 4, Monopoly 4, Product 5).

This is a unanimous "not yet, but there's something here". Nobody funds it as pitched. Nobody kills it either. All three put the same condition at the top: prove it on real field-service data before building anything.

Memos: [offers](board/offers.md) · [monopoly](board/monopoly.md) · [product](board/product.md) · [brief](board/brief.md)

## Risks raised by more than one member (these come first)

1. **The data may not show the deviation (all three, each ranked it #1 or #2).** The idea came from manufacturing, where video, desktop events and timed steps exist. In field service a job record is usually a status change, a few timestamps, parts used, a closure code and a line of free text. Skipped, reordered or added steps often never reach the FSM system. With no visible deviation, there is nothing to ask about and nothing to compare.
2. **The outcome comparison may be confounded (Monopoly, Product).** Senior technicians deviate more *and* fix more. Asset age, site, parts availability and job mix also drive first-time fix. So "deviators did better" may only mean "seniors did better". Samples per job type are small, and callbacks arrive weeks later. One wrong recommendation that reaches an SOP ends the buyer's trust.
3. **The technician prompt may fail (Offers, Product).** A tired technician gets a GenAI "why did you do X?" on a phone between jobs. It reads as surveillance whatever the label says, especially in unionised utilities and works-council countries. Low response rates mean an empty tacit-knowledge layer.
4. **No proof and no channel (Offers, Monopoly).** There are no case studies (the 7.2% vs 3.8% figure is illustrative), and "how customers find it" is not decided.

## Where the board disagrees (kept on purpose)

- **Biggest threat.** The Monopoly lens fears the platforms most: ServiceNow, Salesforce Field Service and IFS own the job data, the outcome fields, the tech app and the buyer, and could ship "outcome by deviation" as a feature. The Offers and Product lenses fear the data more than the competition. If the data can't support the claim, the platform question doesn't matter.
- **What to sell.** The Offers lens wants it sold as a money outcome (fewer callbacks and repeat visits) wrapped in a done-for-you pilot with a guarantee. The Product lens wants it cut to one thing: pick the detector, the "why" capture or the outcome proof, and drop the other two from v1.
- **Is it a business or a feature?** The Monopoly lens says that as written nothing here is 10x better than a platform add-on or a CI analyst with a BI tool. The moat only appears if the product pools deviation→outcome data across customers. The other two lenses don't make the moat a condition.
- **What field service changes.** The Monopoly lens sees field service as *better* than manufacturing because outcomes (FTF, callbacks) are already measured. The Product lens sees it as *worse* because execution is barely recorded. Both are right, and that tension is the whole bet.

## Conditions checklist (the rest of the pack ticks these off)

- [ ] **C1. Back-test on historical data first (all three).** Take 12+ months of one real customer's job and outcome records, no technician app. Find at least one repeated deviation tied to better first-time fix or fewer callbacks, and have that customer's service-excellence lead confirm it is real. *Owner: /founder-launch (the cheap real-world test), /founder-ops.*
- [ ] **C2. Prove a deviation class is visible in FSM records (Product, Offers).** Candidates: parts used vs standard kit, time on job, checklist items skipped, step order where checklists are timestamped. Bring 50 real job records. *Owner: /founder-ops, /founder-launch.*
- [ ] **C3. Narrow the beachhead (Monopoly, Product).** One vertical, one FSM platform, one equipment or job type, high volume of repeat jobs, ideally where the parent company already has relationships. Cut video, desktop capture and manufacturing examples from v1. *Owner: /founder-competitors, /founder-marketing.*
- [ ] **C4. Adjust outcomes for technician, asset and site (Product, Monopoly).** Label thin samples "investigate", never "improve". *Owner: /founder-ops (method), /founder-offer (what's promised).*
- [ ] **C5. Test the technician prompt by hand before building it (Product, Offers).** One question, after the job, opt-in, sent by a supervisor or a simple form. Measure response rate and answer quality, and decide what technicians get for answering. *Owner: /founder-launch, /founder-consumer.*
- [ ] **C6. Sell the outcome, not the method (Offers).** Put a money figure on an avoided callback or repeat visit, then build the stack: done-for-you integration, SOP import, findings review, pilot guarantee (e.g. "a validated candidate improvement within 90 days or the pilot is free"). *Owner: /founder-cfo (value per avoided callback), /founder-pricing, /founder-offer.*
- [ ] **C7. Write the moat down (Monopoly).** Get contractual rights to pool anonymised deviation→outcome data across customers (e.g. by equipment model). *Owner: /founder-ops (contracts), /founder-plan.*
- [ ] **C8. Plan for the platforms (Monopoly).** Decide what happens if an FSM vendor competes. Prefer a partnership or marketplace route over a head-on fight. *Owner: /founder-competitors, /founder-marketing.*
- [ ] **C9. Answer the distribution question (Monopoly, Offers).** How do the first 10 customers arrive and what does each cost? What does the parent company sell, to whom, and does it hold job data it may pool? *Owner: /founder-marketing, /founder-cfo.*

## Open questions the board could not answer

- How many target buyers are in the beachhead? → /founder-competitors
- Will heads of service ops pay, and will technicians answer? → /founder-consumer
- What does one avoided callback or repeat visit save, and what are CAC and payback? → /founder-cfo
- What is the price and pilot structure? → /founder-pricing
- How far does DeepHow (or an FSM vendor) already cover this in field service? → /founder-competitors

## The strongest version the board can see

This is **not** quite what was pitched. Start as a **retrospective "callback forensics" diagnostic** on data the customer already has. Sell it through the parent company's existing field-service relationships, on one FSM platform, for one equipment or job type with lots of repeat jobs. Pull 12–24 months of job records (parts, time on job, checklist items, notes) and outcomes (first-time fix, callbacks within 30 days). Adjust for technician, asset and site. Hand back a short list of "successful exceptions": places where technicians repeatedly did something off-standard and the job stuck. Each one goes to the service lead labelled "investigate". The technician "why?" prompt comes second, sent by hand and only about those specific findings, so it reads as "you found something better — tell us" rather than surveillance. Charge for the diagnostic and convert it to a subscription once the first finding is validated. Build the cross-customer deviation→outcome dataset as the moat, so the product is still worth something when the FSM vendors add drift dashboards. The pitch line stays. What changes is the order: prove it from records first, then ask people, then automate.
