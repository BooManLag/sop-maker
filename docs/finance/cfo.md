# CFO: Successful Exceptions (working name)

> Not financial, tax or legal advice. An accountant (and the parent company's finance team) should check the structure, transfer pricing between the venture and the parent, payroll costs and tax before money moves.

## The CFO's note

**Read this first.** Every cost below is an **estimate**. The founder has not yet supplied the team's loaded cost, how much of it the parent company absorbs, or any quoted prices. Sources and reasoning are in [cfo-sources.md](cfo-sources.md). Replace the estimates in [numbers.json](numbers.json) and re-run before anyone treats these as a budget.

**Model convention:** one unit is one *region-month* of subscription at $2,500 ($30,000/yr, from [pricing.md](../offer-pricing/pricing.md)). The tool's "per day" means "active paying regions that month". The entry Exception Scan is modelled separately in [numbers-scan.json](numbers-scan.json).

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

### Board conditions about money ([board.md](../strategy/board.md))

- **C6, put a money figure on an avoided callback: NOT MET.** We still don't know any customer's cost per truck roll or repeat visit. Get it from each design partner in week 1 (offer.md item K). Without it the ROI case procurement asks for doesn't exist.
- **C9, how the first 10 customers arrive and what each costs: NOT MET.** CAC is unknown. Sales cost is buried in the team line plus $4K/month programmes. /founder-marketing must name the channel. The parent company's relationships are the cheapest channel if they exist.
- **C7, data pooling: costed.** $15,000 of legal templates is in startup.
- **Overall: the unit economics work (62–74% contribution). The venture doesn't, at this team size and scale.** Either the team shrinks or the parent absorbs part of it, the price is $36K, or the market must support well over 44 paying regions. Each is testable.

---

Every number below comes from the input file. Nothing is looked up or guessed.

## One region-month (one service region or equipment line on subscription)

| line | per region-month (one service region or equipment line on subscription) |
| --- | ---: |
| Price | $2,500.00 |
| Cloud compute + storage per region (ESTIMATE) | -$120.00 |
| LLM usage: note parsing + technician follow-ups (ESTIMATE) | -$80.00 |
| Customer analyst time: 6 h/month findings review at $75/h loaded (ESTIMATE) | -$450.00 |
| FSM marketplace revenue share, 15% of price (ESTIMATE; varies by marketplace) | -$300.00 |
| **Contribution** (what each region-month (one service region or equipment line on subscription) leaves to pay the fixed costs) | **$1,550.00** (62%) |

## The margin that matters

Fixed costs: $67,000 a month (Team: 2 engineers + 1 data scientist + 1 product/sales lead, $15k/month loaded each (ESTIMATE; parent company may absorb part) $60,000, Base cloud, tooling, security monitoring (ESTIMATE) $3,000, Sales & marketing programmes: events, content, travel (ESTIMATE) $4,000).

- **Break-even: 44 region-month (one service region or equipment line on subscription)s a day.** Below that you lose money every month.
- **Profit margin at your plan** (40 a day): **-5%** of every sale, after every cost.
- Capacity: 60 a day.

## Year 1, month by month

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

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | -5% | 44 | -$723,400 |
| Price -10% | -17% | 52 | -$736,400 |
| Volume -20% | -22% | 44 | -$739,520 |
| Unit costs +15% | -11% | 48 | -$730,810 |

## Red flags

- Year 1 loses money on operations (-$723,400).
- The startup spend is not earned back within year 1.
