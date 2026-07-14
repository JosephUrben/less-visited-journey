# Less Visited trip JSON guide

The app reads `data/trip.json`.

## Required top-level fields

```json
{
  "schemaVersion": 1,
  "demo": false,
  "travellerName": "Customer first name",
  "tripTitle": "Trip title",
  "subtitle": "Regions or theme",
  "startDate": "2026-10-12",
  "endDate": "2026-10-16",
  "timezone": "America/Santiago",
  "currency": "CLP",
  "intro": "Short trip introduction",
  "days": [],
  "practicalInfo": []
}
```

## Day structure

```json
{
  "id": "day-1",
  "date": "2026-10-12",
  "location": "Santiago",
  "theme": "Arrival and orientation",
  "summary": "Short customer-facing summary",
  "activities": []
}
```

## Activity structure

```json
{
  "id": "a1",
  "time": "09:30",
  "title": "Activity title",
  "category": "culture",
  "description": "Customer-facing explanation and practical advice.",
  "duration": "2 hours",
  "cost": "Approx. CLP 15,000",
  "address": "Full or usable address",
  "latitude": -33.4489,
  "longitude": -70.6693,
  "verification": "Verified 2026-10-01"
}
```

## Practical information structure

```json
{
  "title": "Transport",
  "items": [
    "First verified instruction.",
    "Second verified instruction."
  ]
}
```

## Rules

- Every `day.id` and `activity.id` must be unique.
- Use ISO dates: `YYYY-MM-DD`.
- Use 24-hour times: `HH:MM`.
- Do not include secrets or sensitive personal data.
- Treat all prices, opening hours, transport details and access information as requiring verification.
- Keep instructions short enough to read on a phone.
