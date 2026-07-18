import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const JOURNEY_PATHS = [
  path.join(ROOT, "data", "trip.json"),
  path.join(ROOT, "data", "journeys")
];
const ALLOWED_TYPES = new Set(["fixed", "suggested", "optional", "food", "task"]);
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const BLOCKED_KEYS = new Set([
  "passport", "passportNumber", "dateOfBirth", "dob", "medicalRecord",
  "medicalCondition", "medication", "cardNumber", "bankAccount", "paymentDetails"
]);

const errors = [];

function fail(file, message) {
  errors.push(`${path.relative(ROOT, file)}: ${message}`);
}

function assert(file, condition, message) {
  if (!condition) fail(file, message);
}

function validDate(value) {
  return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function scanBlockedKeys(file, value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanBlockedKeys(file, item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) fail(file, `blocked sensitive-data key '${key}' at ${location}`);
    scanBlockedKeys(file, child, `${location}.${key}`);
  }
}

function validateJourney(file, journey) {
  assert(file, journey && typeof journey === "object" && !Array.isArray(journey), "root must be a JSON object");
  if (!journey || typeof journey !== "object") return;

  scanBlockedKeys(file, journey);
  assert(file, journey.schemaVersion === 2, "schemaVersion must be 2");
  assert(file, typeof journey.journeyId === "string" && ID_PATTERN.test(journey.journeyId), "journeyId must contain only letters, numbers, hyphens or underscores");
  assert(file, typeof journey.productType === "string" && journey.productType.trim(), "productType is required");
  assert(file, typeof journey.destination === "string" && journey.destination.trim(), "destination is required");
  assert(file, typeof journey.tripTitle === "string" && journey.tripTitle.trim(), "tripTitle is required");
  assert(file, validDate(journey.startDate), "startDate must be a valid ISO date");
  assert(file, validDate(journey.endDate), "endDate must be a valid ISO date");
  if (validDate(journey.startDate) && validDate(journey.endDate)) {
    assert(file, journey.startDate <= journey.endDate, "startDate must not be after endDate");
  }
  assert(file, typeof journey.timezone === "string" && journey.timezone.trim(), "timezone is required");
  assert(file, typeof journey.currency === "string" && /^[A-Z]{3}$/.test(journey.currency), "currency must be a three-letter uppercase code");
  assert(file, Array.isArray(journey.days) && journey.days.length > 0, "days must be a non-empty array");
  assert(file, Array.isArray(journey.places), "places must be an array");

  const placeIds = new Set();
  for (const [index, place] of (journey.places || []).entries()) {
    const label = `places[${index}]`;
    assert(file, place && typeof place === "object", `${label} must be an object`);
    if (!place || typeof place !== "object") continue;
    assert(file, typeof place.id === "string" && ID_PATTERN.test(place.id), `${label}.id is invalid`);
    if (place.id) {
      assert(file, !placeIds.has(place.id), `duplicate place id '${place.id}'`);
      placeIds.add(place.id);
    }
    assert(file, typeof place.name === "string" && place.name.trim(), `${label}.name is required`);
    assert(file, typeof place.destination === "string" && place.destination.trim(), `${label}.destination is required`);
    assert(file, typeof place.category === "string" && place.category.trim(), `${label}.category is required`);
    assert(file, typeof place.description === "string" && place.description.trim(), `${label}.description is required`);
    const hasCoordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
    assert(file, hasCoordinates || typeof place.mapUrl === "string" || typeof place.address === "string", `${label} needs coordinates, mapUrl or address`);
    if (place.tags !== undefined) assert(file, Array.isArray(place.tags), `${label}.tags must be an array`);
  }

  const dayIds = new Set();
  const activityIds = new Set();
  for (const [dayIndex, day] of (journey.days || []).entries()) {
    const label = `days[${dayIndex}]`;
    assert(file, day && typeof day === "object", `${label} must be an object`);
    if (!day || typeof day !== "object") continue;
    assert(file, typeof day.id === "string" && ID_PATTERN.test(day.id), `${label}.id is invalid`);
    if (day.id) {
      assert(file, !dayIds.has(day.id), `duplicate day id '${day.id}'`);
      dayIds.add(day.id);
    }
    assert(file, validDate(day.date), `${label}.date must be a valid ISO date`);
    if (validDate(day.date) && validDate(journey.startDate) && validDate(journey.endDate)) {
      assert(file, day.date >= journey.startDate && day.date <= journey.endDate, `${label}.date falls outside the journey dates`);
    }
    assert(file, typeof day.location === "string" && day.location.trim(), `${label}.location is required`);
    assert(file, typeof day.theme === "string" && day.theme.trim(), `${label}.theme is required`);
    assert(file, typeof day.summary === "string" && day.summary.trim(), `${label}.summary is required`);
    assert(file, typeof day.routeLogic === "string" && day.routeLogic.trim(), `${label}.routeLogic is required`);
    assert(file, Array.isArray(day.activities), `${label}.activities must be an array`);

    for (const [activityIndex, activity] of (day.activities || []).entries()) {
      const activityLabel = `${label}.activities[${activityIndex}]`;
      assert(file, activity && typeof activity === "object", `${activityLabel} must be an object`);
      if (!activity || typeof activity !== "object") continue;
      assert(file, typeof activity.id === "string" && ID_PATTERN.test(activity.id), `${activityLabel}.id is invalid`);
      if (activity.id) {
        assert(file, !activityIds.has(activity.id), `duplicate activity id '${activity.id}'`);
        activityIds.add(activity.id);
      }
      assert(file, typeof activity.title === "string" && activity.title.trim(), `${activityLabel}.title is required`);
      assert(file, ALLOWED_TYPES.has(activity.type), `${activityLabel}.type must be one of ${[...ALLOWED_TYPES].join(", ")}`);
      if (activity.time !== undefined) assert(file, activity.time === "Flexible" || TIME_PATTERN.test(activity.time), `${activityLabel}.time must use 24-hour HH:MM or 'Flexible'`);
      if (activity.placeId) assert(file, placeIds.has(activity.placeId), `${activityLabel}.placeId '${activity.placeId}' does not match an approved place`);
    }
  }
}

async function collectJsonFiles(target) {
  const details = await stat(target).catch(() => null);
  if (!details) return [];
  if (details.isFile()) return target.endsWith(".json") ? [target] : [];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collectJsonFiles(path.join(target, entry.name))));
  return nested.flat();
}

const files = (await Promise.all(JOURNEY_PATHS.map(collectJsonFiles))).flat().sort();
assert(ROOT, files.length > 0, "no journey JSON files were found");

for (const file of files) {
  try {
    const journey = JSON.parse(await readFile(file, "utf8"));
    validateJourney(file, journey);
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
  }
}

if (errors.length) {
  console.error(`Journey validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${files.length} journey JSON file${files.length === 1 ? "" : "s"}.`);
