# Prompt for converting an approved itinerary into the app format

Use this only after the itinerary has been reviewed by Less Visited.

```text
Convert the approved Less Visited itinerary below into valid JSON that follows the supplied TRIP-SCHEMA.md structure.

Requirements:
- Return JSON only, with no markdown fences or explanation.
- Keep all factual content faithful to the approved itinerary.
- Do not invent places, prices, opening hours, routes, booking details or verification dates.
- Where information is missing, use a clear value such as "Confirm before publication" rather than guessing.
- Give every day and activity a unique stable ID.
- Use ISO dates and 24-hour times.
- Keep descriptions practical, concise and readable on a mobile phone.
- Set "demo" to false only when Less Visited has verified the published content.
- Do not include passport information, medical details, payment data, private booking documents or API keys.

APPROVED ITINERARY:
[PASTE THE APPROVED ITINERARY HERE]
```
