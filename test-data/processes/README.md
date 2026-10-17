# Process test data

Fictional job records for the four processes in the shared prototype workspace. Nothing here is real. Regenerate with `npm run testdata:generate` (output is deterministic).

Scan each file against its published SOP under **Improve existing SOP**. In every file `callback_within_30_days` means the job came back within 30 days: a joint failed, a phone was returned, a door stuck, a ticket reopened.

| SOP                     | File                          | Rows | Planted practice                                                      | Expected grade                |
| ----------------------- | ----------------------------- | ---- | --------------------------------------------------------------------- | ----------------------------- |
| Soldering 202           | `soldering-202.csv`           | 240  | IPA wipe and fresh flux on every pad before reflowing                 | **Strong** · 2.4% vs 17.5%    |
| iPhone 11 Screen Repair | `iphone-11-screen-repair.csv` | 220  | Test touch and Face ID before sealing the phone                       | **Promising** · 4.3% vs 13.2% |
| Shed Building           | `shed-building.csv`           | 200  | Level the base and square the frame by its diagonals before sheathing | **Strong** · 2.6% vs 17.1%    |
| Reset BIOS              | `reset-bios.csv`              | 240  | Suspend BitLocker and record boot settings before resetting           | **Promising** · 2.3% vs 10.4% |

Each file also holds a shortcut that raises callbacks (sealing before testing, skipping the level check), routine notes and unrelated notes. Every file passes the readiness check.

The expected grades are what the app's statistics give when the notes describing the practice are grouped together.

- **Local demo:** run `npm run seed:manufacturing` to add the four SOPs, then scan. The simulated analysis returns exactly the finding in the table for each file, with the same numbers.
- **Production:** the live scan groups notes by Gemini embedding similarity. At the current threshold it merges all notes in a dataset into one group, so it returns no findings for these files until that is fixed.

Each scan stores its rows in the workspace for 30 days. Together the four files take roughly 300 KB of the workspace's 750 KB limit, so avoid re-importing them repeatedly.
