# Finished surveys by email only

Every completed survey already sends the full lead to the office email immediately. Keep that as the only owner alert.

## Change

- Remove the new owner phone-text attempt entirely.
- Keep the existing office email with the visitor's name, phone, email, address, survey answers, source and reference number.
- Keep the backup Gmail delivery already in place.
- Leave the visitor's own confirmation and follow-up flow unchanged.

No texting account is required and nothing will be sent to 817-663-7665.

## Verified current flow

The survey submission saves the lead, then calls the existing notification flow. That flow reads the configured office email list and falls back to `marcus@santanariveragroup.com`, with a second delivery through the connected Gmail inbox.
