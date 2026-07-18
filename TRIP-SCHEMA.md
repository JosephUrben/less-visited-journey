# Less Visited journey JSON guide

The companion uses schema version 2. The default demonstration is `data/trip.json`. Published journeys can also be stored in `data/journeys/` and loaded with `?trip=JOURNEY-ID`.

## Core journey fields

```json
{
  "schemaVersion": 2,
  "journeyId": "JRN-0001",
  "productType": "Personalised Journey",
  "demo": false,
  "travellerName": "First name",
  "destination": "Destination",
  "tripTitle": "Journey title",
  "subtitle": "Regions or theme",
  "startDate": "2026-10-12",
  "endDate": "2026-10-16",
  "timezone": "America/Santiago",
  "currency": "CLP",
  "intro": "Short customer-facing introduction",
  "routeOverview": "Why the overall route works",
  "days": [],
  "places": []
}
```

## Day and activity

Each day needs `id`, `date`, `location`, `theme`, `summary`, `routeLogic` and `activities`.

Each activity needs a unique `id`, `title`, `type` and, where relevant, a `placeId` matching an approved place. Supported types are:

- `fixed`
- `suggested`
- `optional`
- `food`
- `task`

Activities can also contain `time`, `description`, `duration`, `travelTime`, `cost`, `address`, coordinates, `practicalNote`, `alternative` and `verification`.

## Approved places

Each place should contain:

- `id`, `name`, `destination`, `neighbourhood`, `category` and `description`;
- coordinates or a `mapUrl`;
- `practicalNote` and verification information;
- filter `tags`, using any of `nearby`, `food`, `viewpoints`, `culture`, `rainy-day`, `free`, `evening`, `accessible`, `quick-stop`;
- `scheduled`, `active`, and optionally `alternativeFor` plus `bestFor`.

## Supporting trip data

The companion also accepts:

- `accommodation` object;
- `bookings` array;
- `preparationChecklist` and `packingChecklist` arrays;
- simple `budget` rows;
- `map` with summary, external route URLs and stops;
- `practicalInfo` sections;
- `emergencyInfo` array.

## Publication rules

- Use only approved places and reviewed route information.
- Use ISO dates and 24-hour times.
- Never invent opening hours, connections, prices or access information.
- Do not include passport, medical, payment or other sensitive personal data.
- Keep IDs stable so saved customer data continues to match after an update.
