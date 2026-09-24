## Technical details
- `src/lib/website-to-app.functions.ts`: add two office-gated functions.
  - `getAppCustomersMissing`: reads `ss_customers` created in the last 90 days and compares their phone digits and lowercase email against `inspection_requests`. Returns the total and the missing customers.
  - `pushAppCustomersToWebsite({ ids })` (max 500): inserts `inspection_requests` rows using name, phone, email, address and city, with source `crm_app`, status `converted` and `converted_customer_id` set. Before inserting, it checks each customer again to avoid duplicates. No customer emails are sent and no CRM forward runs, so nothing loops back to the app.
- `src/routes/admin/website-to-app.tsx`: add the second row and button to the SameOnBoth box, then refresh the counts after the push.
- No database changes are needed.
- To verify: sign in as the office, run the push with one test customer, confirm the count drops, then remove the test row.
