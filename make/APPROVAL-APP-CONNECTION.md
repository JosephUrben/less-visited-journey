# Connect the GitHub reviewer app to Make

The companion now supports an internal reviewer mode without storing the Make webhook URL in this public repository.

## Reviewer URL

Use the same random public trip ID as the customer journey, but add `review=1`:

```text
https://josephurben.github.io/less-visited-journey/?trip={PUBLIC_TRIP_ID}&review=1#home
```

Example:

```text
https://josephurben.github.io/less-visited-journey/?trip=JRN-0001&review=1#home
```

The ordinary customer link does not include `review=1`:

```text
https://josephurben.github.io/less-visited-journey/?trip={PUBLIC_TRIP_ID}#home
```

## First reviewer use

1. Open the reviewer URL.
2. Click **Connect Make approval**.
3. Paste the custom webhook URL from the main Less Visited Make scenario.
4. Enter the reviewer name.

The webhook is saved only in that browser's local storage. It is not committed to GitHub and is not sent to customers.

## Events sent to Make

### Approval

```json
{
  "event_type": "REVIEW_DECISION",
  "source": "less-visited-github-reviewer",
  "journey_id": "JRN-EXAMPLE",
  "public_trip_id": "LV-RANDOM-PUBLIC-ID",
  "review_decision": "Approve as-is",
  "reviewer_notes": "Approved in the Less Visited reviewer companion.",
  "reviewer_name": "Joseph",
  "journey_version": 1,
  "submitted_at": "2026-07-19T12:00:00.000Z"
}
```

### Request regeneration

The existing change-request dialog sends:

```json
{
  "event_type": "REVIEW_DECISION",
  "review_decision": "Regenerate",
  "reviewer_notes": "Section, reason, requested changes and items that must stay"
}
```

### Ask customer

```json
{
  "event_type": "REVIEW_DECISION",
  "review_decision": "Customer clarification",
  "reviewer_notes": "The question to send to the customer"
}
```

### Reject

```json
{
  "event_type": "REVIEW_DECISION",
  "review_decision": "Reject",
  "reviewer_notes": "Reason for rejection"
}
```

These values match the review-decision branch in the complete Make blueprint.

## Required Make workflow order

For the reviewer app to display the AI draft, Make must make the draft journey JSON available before human approval.

Recommended MVP sequence:

1. Tally submission arrives.
2. Make creates the customer and order records.
3. Make gathers approved database records.
4. OpenAI creates `Draft_JSON`.
5. Automated validation runs.
6. Make writes the draft JSON to:

   ```text
   data/journeys/{Public_Trip_ID}.json
   ```

7. Make emails the reviewer the URL containing `&review=1`.
8. Reviewer checks the journey in the companion.
9. Reviewer approves or requests changes in the companion.
10. The companion posts `REVIEW_DECISION` to Make.
11. Make updates `Approved_JSON` and the workflow status.
12. Make updates the GitHub file if necessary.
13. Make emails the customer the ordinary link without `review=1`.

The draft file is technically public because GitHub Pages is public, but it is not sent to the customer before approval and uses a random public ID. Do not put sensitive customer information into the journey JSON.

## Make filters

The top-level event router should accept:

```text
event_type = REVIEW_DECISION
```

Then search `Orders_Journeys` using:

```text
Journey_ID = journey_id
```

Decision filters:

```text
Approve as-is
Regenerate
Customer clarification
Reject
```

## Customer-facing behaviour

Without `review=1`:

- the internal approval button is hidden;
- the Make connection panel is hidden;
- the customer sees the published companion and update tools;
- no Make webhook URL is available in the page source.

## Security boundary

This is suitable for an MVP reviewer workflow, not high-security authentication.

- GitHub Pages remains public.
- The Make webhook URL is stored only in the reviewer's browser.
- Public trip IDs must be long and random.
- Journey JSON must exclude passport, payment, health and other sensitive data.
- A later production version should use an authenticated backend or serverless approval API.
