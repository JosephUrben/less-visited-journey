# Less Visited simplified MVP automation

The first production version uses two small Make scenarios. Neither scenario needs a router.

## Scenario 1 — Create and publish a draft for review

Name:

```text
LV01 — Paid request to review draft
```

Trigger: one Tally custom webhook after successful form submission and payment.

### Linear modules

1. **Webhooks — Custom webhook**
   - Receive the Tally submission.
   - Capture one real test submission before mapping fields.

2. **Tools — Set multiple variables**
   - Normalize Tally labels into the field contract in `tally/TALLY-FORM-BUILD.md`.
   - Generate:
     - `request_id = REQ-{{formatDate(now; "YYYYMMDD-HHmmss")}}-{{random}}`
     - `journey_id = JRN-{{random long ID}}`
     - `public_trip_id = LV-{{random long unguessable ID}}`
     - `workflow_status = Generating`
     - `delete_pii_after` according to the approved retention period.

3. **Google Sheets — Add a row**
   - Spreadsheet: `Less Visited Client Requests`
   - Tab: `MVP_Requests`
   - Store the private customer request and payment confirmation.
   - Do not store card information.

4. **Google Sheets — Search rows**
   - Spreadsheet: `Less Visited Master database`
   - Tab: `Supported_Destinations`
   - Filter:
     - `Destination_Code = submitted destination_code`
     - `Tally_Enabled = TRUE`
     - `Launch_Status = Live`
   - Limit: 1 row.
   - If no row matches, stop the run and mark the request `Error`.

5. **Google Sheets — Search rows**
   - Spreadsheet: `Less Visited Master database`
   - Tab: `AI_Approved_Records`
   - Filter:
     - `Destination_Code = submitted destination_code`
     - `Verification_Status = Verified`
     - `Publish_Ready = TRUE`
     - `Active = TRUE`

6. **Array aggregator**
   - Aggregate the approved records into one `approvedRecords` array.

7. **OpenAI — Create a response**
   - Responses API.
   - Model: `gpt-5.6-terra`.
   - Reasoning effort: medium.
   - `store = false`.
   - No tools.
   - System instructions: `make/OPENAI-MVP-SYSTEM-PROMPT.md`.
   - Structured output: strict JSON Schema from `schemas/journey.schema.json`.
   - Dynamic payload: customer request, destination defaults and aggregated approved records.

8. **Google Sheets — Update row**
   - Set:
     - `Workflow_Status = Human Review`
     - `Draft_JSON_URL = https://raw.githubusercontent.com/JosephUrben/less-visited-journey/main/data/journeys/{Public_Trip_ID}.json`
     - `Reviewer_URL = {private approval dashboard URL}?trip={Public_Trip_ID}`
     - clear `Last_Error`.

9. **HTTP — Make a request to GitHub Contents API**
   - Method: PUT.
   - Repository: `JosephUrben/less-visited-journey`.
   - Path: `data/journeys/{Public_Trip_ID}.json`.
   - Commit the OpenAI JSON as a draft.
   - GitHub token must be stored in the Make connection/header, never in a public repository.

10. **Gmail — Send reviewer email**
    - To: Joseph.
    - Subject: `Journey ready for approval — {Journey_ID}`.
    - Include the private approval-dashboard link with `?trip={Public_Trip_ID}`.
    - State clearly that the customer has not yet received the journey.

### Result

The run ends after the reviewer email. It does not wait for approval.

---

## Scenario 2 — Approve, publish and deliver

Name:

```text
LV02 — Approval to customer delivery
```

Trigger: one Make custom webhook used only by the private approval dashboard.

### Accepted event

The current dashboard submits:

```text
event_type = REVIEW_DECISION
review_decision = Approve as-is OR Approve edited
journey_id
public_trip_id
approved_json (only for Approve edited)
reviewer_name
reviewer_notes
submitted_at
```

Add a filter immediately after the webhook:

```text
review_decision equals Approve as-is
OR
review_decision equals Approve edited
```

This is a filter, not a router.

### Linear modules

1. **Webhooks — Custom webhook**
   - Receive the approval dashboard submission.

2. **Google Sheets — Search rows**
   - Spreadsheet: `Less Visited Client Requests`.
   - Tab: `MVP_Requests`.
   - Filter: `Public_Trip_ID = public_trip_id`.
   - Limit: 1 row.

3. **HTTP — Get current GitHub journey file**
   - GET `data/journeys/{Public_Trip_ID}.json` through the GitHub Contents API.
   - Read the current content SHA and draft JSON.

4. **Tools — Set approved JSON**
   - If `approved_json` exists, use it.
   - Otherwise decode and use the current GitHub draft JSON.
   - Set `journeyStatus = approved` and preserve the supplied Public Trip ID.

5. **HTTP — Update GitHub journey file**
   - PUT the approved JSON to the same path using the current content SHA.
   - Commit message: `Approve journey {Journey_ID}`.

6. **Google Sheets — Update request row**
   - Set:
     - `Workflow_Status = Published`
     - `Approved_At = submitted_at`
     - `Customer_URL = https://josephurben.github.io/less-visited-journey/?trip={Public_Trip_ID}#home`
     - `Delivery_Status = Not sent`
     - clear `Last_Error`.

7. **Gmail — Send branded customer delivery email**
   - To: `Customer_Email` from the private request row.
   - Use `make/CUSTOMER-DELIVERY-EMAIL.html`.
   - Link only to the customer URL without reviewer parameters.

8. **Google Sheets — Update request row**
   - Set:
     - `Workflow_Status = Delivered`
     - `Delivery_Status = Sent`
     - `Delivered_At = now`.

### Result

The approved journey remains at:

```text
https://josephurben.github.io/less-visited-journey/?trip={Public_Trip_ID}#home
```

---

## Error handling

For the first MVP, add one error handler to each scenario rather than multiple exception routes.

The handler should:

1. update `Workflow_Status = Error`;
2. write the Make error message to `Last_Error`;
3. email Joseph with the Request ID and failed module;
4. never email the customer on a failed run.

## Security rules

- Keep the Client Requests spreadsheet restricted.
- Do not send customer email or payment data to OpenAI.
- Do not publish sensitive customer information in GitHub JSON.
- Use long random Public Trip IDs.
- Store the GitHub token, OpenAI key and Make webhooks only in connected services or browser-local settings.
- Keep the approval dashboard repository private and GitHub Pages disabled.
