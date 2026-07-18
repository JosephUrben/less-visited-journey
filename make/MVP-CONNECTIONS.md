# Less Visited MVP connection build

This is the operational contract for connecting Tally, Stripe, Make, the **Less Visited Master database**, OpenAI, GitHub Pages and Gmail.

## What is already ready

- GitHub companion: `JosephUrben/less-visited-journey`
- Journey loading: `?trip={PUBLIC_TRIP_ID}`
- Master spreadsheet tabs:
  - `Customers_Travel_Profiles`
  - `Orders_Journeys`
  - `Journey_Modules`
  - `Journey_Items`
  - `Review_Queue`
  - `Lists_Config`
- GitHub publication folder: `data/journeys/`

## Security rule

GitHub Pages and this repository are public. Never publish passport, medical, payment or other sensitive data. Do not use a sequential ID such as `JRN-0001` as the customer-facing access token. Generate a random public ID, for example `LV-7F4A9C2D81B6`, and store the internal `Journey_ID` separately.

The public ID is an unguessable link, not real authentication. Customer accounts or truly private data require a private backend and are outside this MVP.

## Scenario A — intake and draft generation

Trigger: Tally `Watch New Responses` or a custom webhook receiving the structure in `intake-payload.example.json`.

### Module sequence

1. **Tally — Watch New Responses**
2. **Tools — Set variables**
   - `customer_id`: search existing customer by lower-case email; otherwise create `CUS-` plus a padded sequence or UUID fragment.
   - `journey_id`: `JRN-` plus a padded sequence or UUID fragment.
   - `public_trip_id`: `LV-` plus at least 12 random hexadecimal characters.
   - `created_on`: current ISO timestamp.
3. **Google Sheets — Search Rows** in `Customers_Travel_Profiles` by exact lower-case email.
4. **Router**
   - Existing customer: update preferences and `Updated_On`.
   - New customer: add a row with `Customer_ID`, contact details, consent and preferences.
5. **Google Sheets — Add a Row** to `Orders_Journeys`.
   - `Journey_ID`
   - `Customer_ID`
   - `Product_Type`
   - `Payment_Status`: `Not required` for free preview, otherwise `Pending` unless Stripe already confirmed payment.
   - destination and dates
   - `Workflow_Status`: `New request`
   - `Created_On`
   - `Public_Trip_ID`
   - `Tally_Submission_ID`
6. **Filter**
   - Free preview: continue without Stripe.
   - Paid products: continue only when `Payment_Status = Paid`.
7. **Google Sheets — Search Rows** for approved records relevant to the destination, interests and template. Use only records whose verification/active fields allow publication.
8. **JSON — Create JSON** containing:
   - customer constraints;
   - selected journey template/module;
   - approved place and route records;
   - required public and internal IDs;
   - the output schema.
9. **OpenAI — Create a response** using `OPENAI-SYSTEM-PROMPT.md` and strict JSON-schema output from `schemas/journey.schema.json`.
10. **JSON — Parse JSON** using the same data structure.
11. **Validation filters**
    - schema version is 2;
    - journey ID matches the order;
    - all activity place IDs exist in the approved place list;
    - no blocked sensitive fields are present;
    - dates match the order;
    - output is below the Google Sheets cell limit.
12. **Google Sheets — Update a Row** in `Orders_Journeys`.
    - `Draft_JSON`: the compact JSON string;
    - `Draft_Generated_On`: now;
    - `Workflow_Status`: `Human review`;
    - clear `Last_Automation_Error`.
13. **Google Sheets — Add a Row** to `Review_Queue`.
    - entity: journey;
    - review type: itinerary;
    - status: open/human review;
    - issue summary: standard approval checklist.
14. **Gmail — Send email to reviewer** with the journey ID and direct spreadsheet link.

### Error route

Attach an error handler after OpenAI, JSON parsing and sheet writes:

- update `Last_Automation_Run`;
- write the error message to `Last_Automation_Error`;
- set `Workflow_Status = Data incomplete` or keep `Human review` when a draft exists;
- send an internal Gmail alert;
- do not publish or email the customer.

## Human approval

Review the draft against:

- customer requirements;
- fixed bookings;
- route order and realistic travel;
- duplicate stops;
- source verification;
- alternatives;
- writing quality;
- absence of sensitive data.

Paste the corrected final object into `Approved_JSON` and change `Workflow_Status` to `Approved`.

## Scenario B — approval, GitHub publication and customer email

Schedule: every 5 minutes for the MVP, or use a Sheets watch module when stable.

### Module sequence

1. **Google Sheets — Search Rows** in `Orders_Journeys` where:
   - `Workflow_Status = Approved`;
   - `Approved_JSON` is not empty;
   - `Publication_URL` is empty, or the approved JSON has changed since the last publish.
2. **JSON — Parse JSON** from `Approved_JSON`.
3. **Validation filters** identical to Scenario A.
4. **GitHub — Get a File** at `data/journeys/{Public_Trip_ID}.json` on `main`.
   - Treat a 404 as a new journey.
5. **Router**
   - File absent: **GitHub — Create a File**.
   - File present: **GitHub — Update a File** using the returned file SHA.
6. File content: the approved JSON, prettified if convenient.
7. Commit message: `Publish journey {Journey_ID}` or `Update journey {Journey_ID}`.
8. **Tools — Sleep** for roughly 30 seconds only if a live-link check is required. The workflow itself does not need to wait for Pages to deploy.
9. **HTTP — Make a request** to the raw journey URL or customer URL and confirm HTTP 200. Retry with bounded attempts; never loop indefinitely.
10. **Google Sheets — Update the order**.
    - `GitHub_Content_SHA`: returned SHA;
    - `Published_On`: now;
    - `Publication_URL`: `https://josephurben.github.io/less-visited-journey/?trip={Public_Trip_ID}#home`;
    - `Workflow_Status`: `Published`;
    - `Magic_Link_Status`: `Sent` after successful email;
    - clear `Last_Automation_Error`.
11. **Gmail — Send customer journey email** with the exact publication URL, offline instructions and support wording.

### Update safety

The GitHub update module requires the current file SHA. Always get the file first. Never run two updates for the same public trip ID in parallel. Keep stable activity and place IDs so local saved data continues to match.

## Scenario C — free preview

Use a separate lightweight route from Scenario A:

1. Tally response.
2. Create/search customer.
3. Select approved destination records.
4. OpenAI returns one sample day, five approved places and a short route explanation.
5. Store the result and send it by Gmail.
6. Do not publish a customer companion unless the preview is intentionally being demonstrated as a guide.

## Scenario D — Stripe payment update

Trigger: Stripe `Watch Events` for completed checkout/payment.

1. Match the Stripe client reference or metadata to `Journey_ID`.
2. Set `Payment_Status = Paid` and record `Stripe_Payment_ID`.
3. Set `Workflow_Status = Payment confirmed`.
4. Call or allow Scenario A to continue from approved paid orders.
5. Refund/failed-payment events update status but never delete the customer record.

## Required connections in Make

- Tally
- Google Sheets
- OpenAI
- GitHub
- Gmail
- Stripe for paid products
- HTTP for the optional publication check

Connections and credentials are account-bound. Make blueprints preserve modules and mappings, but imported scenarios still require the owner to select or create each connection.

## Test order

1. Run Scenario B first using the existing demo `JRN-0001` record and a non-customer test public ID.
2. Confirm the generated GitHub file passes the repository validation action.
3. Open the customer URL online once, then test offline.
4. Update the approved JSON and confirm the app refreshes online but still falls back to the cached copy offline.
5. Run Scenario A with a test Tally response.
6. Test invalid JSON, missing place IDs, duplicate submissions and an expired/revoked connection.
7. Only then enable customer email and Stripe routes.
