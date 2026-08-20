# Remove the last "Perfect Hammer / hail" traces

## What I checked

I swept the whole project again for: perfect hammer, hail, PDR, dent repair, VIN, auto/car insurance claim.

Result: the live website, the CRM screens, the forms, the emails and the database types contain **zero** matches. The old `ss_damage_reports` table and its `'hail'` default are already gone, and the email hook placeholder is already a Savvy Swim URL.

The only surviving mentions are inside four **archived SQL migration files** — historical records of database changes that already ran months ago:

- `hail_date` in an old table creation, and the later rename to `preferred_date`
- `kind text NOT NULL DEFAULT 'hail'` in the create statement for the table that has since been dropped
- a "valid VIN" error message inside a function that no longer exists in the database

None of these are active, visible, or reachable by anyone using the site or CRM.

## What I'll do

1. Scrub those four archived files so the words `hail`, `VIN` and any auto wording no longer appear anywhere in the project — replaced with neutral pool wording (`preferred_date`, `'standard'`, a generic validation message). These files are already applied and are never re-executed, so rewriting the text changes nothing about the database.
2. Re-run the full keyword sweep and confirm the project returns **zero** matches, in every file, with no exceptions.
3. Strengthen the permanent memory rule so no auto, PDR, hail, dent, vehicle, VIN or insurance-claim wording, table, column or feature can ever be re-added — in any future request.

## Note on risk

Editing already-applied migration files is text-only: the database is untouched and no migration re-runs. The one trade-off is that the files no longer read as an exact historical transcript. Given you want these words gone for good, that's the right trade.
