# Purge remaining auto / PDR / hail traces

I checked the whole project. The public website copy, pages, forms, emails and CRM screens are already 100% pool-only — no PDR, hail damage, car insurance, dent repair or "Perfect Hammer" wording anywhere a visitor or staff member can see.

Three leftovers still exist behind the scenes:

1. **`ss_damage_reports` database table** — created in the auto era, its `kind` column still defaults to `'hail'`. It has 0 rows and no code anywhere reads or writes it.
2. **A sample URL in the auth email hook** (`hail-call-assist.lovable.app`) used only as a placeholder inside the email function.
3. **Old migration files** that mention `hail_date` and a VIN validation message. These are historical records of changes already applied and cannot be rewritten safely.

## What I'll do

- Drop the unused `ss_damage_reports` table entirely (it's empty, nothing references it), which also removes the `'hail'` default. Regenerate the database types so the name disappears from the codebase.
- Replace the placeholder sample URL in the auth email hook with a Savvy Swim URL.
- Sweep for any residual keyword after the change and confirm zero matches outside historical migration files.
- Reinforce the standing memory rule: no auto, PDR, hail, dent, vehicle or insurance-claim features, tables or copy — ever re-added.

## Notes on the old migrations

The `.sql` migration files in history keep words like `hail_date` and `VIN` because they document changes that already ran. Editing them would desync the migration history and risk breaking future deploys. Nothing in them is active: `hail_date` was renamed to `preferred_date` long ago, and the VIN check belonged to a function that no longer exists in the database. They're inert text, invisible to users.
