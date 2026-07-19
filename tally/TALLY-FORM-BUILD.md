# Less Visited paid itinerary Tally form

This is the only customer intake form for the first MVP.

## Product

**Personalised Less Visited Journey**

One fixed price. Payment is collected in the final Tally step using the Stripe payment block. Do not create free, guide, tailored or add-on branches yet.

## Form settings

- Require completion before submission.
- Send one submission only after a successful payment.
- Redirect successful submissions to the Trip Starter page.
- Do not pass personal or sensitive answers in the redirect URL.
- Use exact question labels because Make maps these labels.

## Page 1 — Your trip

1. **First name** — short answer, required.
2. **Email address for delivery** — email, required.
3. **Destination** — dropdown, required. Include only rows from `Supported_Destinations` where `Tally_Enabled = TRUE` and `Launch_Status = Live`.
4. **Destination code** — hidden field matching the selected destination.
5. **Cities, towns or areas you expect to visit** — long answer, optional.
6. **Trip start date** — date, required.
7. **Trip end date** — date, required.
8. **Traveller type** — single choice: Solo traveller; Couple; Friends; Family with children; Mixed-age group; Other.
9. **Number of travellers** — number, required.
10. **Children travelling?** — yes/no. When yes, show broad age ranges only: Under 5; 5–11; 12–17.

## Page 2 — What is fixed

11. **Accommodation booked?** — yes/no.
12. **Accommodation base** — conditional long answer. Ask for town, neighbourhood or accommodation name, not a private residential address.
13. **Arrival details** — long answer. Ask for date, approximate time, airport/station and transfer already booked.
14. **Departure details** — long answer.
15. **Existing bookings and fixed plans** — long answer. Include events, transport, tours and restaurant bookings, but instruct customers not to paste private booking references.

## Page 3 — Travel style

16. **Pace** — Slow and spacious; Relaxed; Balanced; Active; Very full days.
17. **Daily budget style excluding accommodation** — Budget-conscious; Comfortable; Mid-range; Premium; Flexible.
18. **Interests** — checkboxes, maximum five: Local food; Independent cafés; History; Architecture; Art and design; Nature; Hiking and walking; Beaches and coast; Viewpoints; Markets; Local neighbourhoods; Nightlife; Music; Football and sporting culture; Photography; Family activities; Relaxation; Less obvious places.
19. **Three main priorities** — long answer, required.
20. **Must-do places or experiences** — long answer, optional.
21. **Things to avoid** — long answer, optional.
22. **Local transport preferences** — checkboxes: Walking; Public transport; Trains; Buses; Taxis or ride-hailing; Rental car; Cycling; No preference.
23. **Early starts** — Happy to start early; Occasionally; Prefer not to; Never unless essential.
24. **Crowd tolerance** — Comfortable; Fine for important sights; Prefer quieter times; Avoid where possible.

## Page 4 — Practical requirements

25. **Food requirements** — long answer. Instruction: provide only practical information needed to choose suitable places; no medical history is required.
26. **Access requirements** — long answer. Instruction: describe practical needs such as step-free access, avoiding stairs or limiting walking; no diagnosis is required.
27. **Additional information** — long answer, optional.

## Page 5 — Confirmation and payment

Show an answer summary for destination, dates, traveller count, pace and interests.

28. **Details confirmation** — required checkbox: `I confirm that my dates, destination and delivery email are correct.`
29. **Privacy acknowledgement** — required checkbox: `I understand that Less Visited will use my answers to create and deliver my itinerary and may process the request using Tally, Stripe, Google Workspace, Make and the OpenAI API. I have read the Privacy Notice.`
30. **Terms acknowledgement** — required checkbox: `I accept the service description, expected delivery time, cancellation terms and refund policy.`
31. **Payment** — one Tally Stripe payment block with the fixed MVP price.

## Hidden fields

- `event_type` = `CUSTOMER_INTAKE`
- `product_type` = `personalised_itinerary`
- `form_version` = `mvp-1`
- `source`
- `campaign`
- `destination_code`

## Successful redirect

Use:

```text
https://josephurben.github.io/less-visited-journey/starter.html?destination={Destination}&trip_length={Trip start date}%20to%20{Trip end date}&submission_id={Submission ID}
```

Map the Tally answer variables using Tally's redirect editor rather than typing brace syntax literally.

Do not pass first name, email, payment ID, dietary information, access information, bookings or free-text answers in the redirect.

## Make field contract

Make must receive or normalize these names:

```text
submission_id
submitted_at
payment_status
stripe_payment_id
amount_paid
payment_currency
first_name
email
destination
destination_code
travel_start
travel_end
traveller_type
number_of_travellers
accommodation_base
arrival_details
departure_details
pace
budget_style
interests
must_do
must_avoid
transport_preferences
food_requirements
access_requirements
existing_bookings
additional_notes
consent_recorded_at
```
