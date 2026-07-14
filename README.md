# Less Visited Journey — static PWA starter

A mobile-first, installable and offline-friendly travel companion designed for the first Less Visited prototype.

## What this version does

- Displays a customer-specific day-by-day itinerary.
- Chooses the relevant trip day automatically when the current date matches the itinerary.
- Allows the traveller to save places, mark activities complete and add notes.
- Stores those personal changes in the browser on the current device.
- Opens each location in Google Maps.
- Works offline after the first successful online visit.
- Can be installed on supported phones and desktops.
- Allows a trip JSON file to be previewed locally through the Info screen.
- Can be published through GitHub Pages.

## What this version deliberately does not do

- No customer accounts or passwords.
- No secure private data storage.
- No online payments.
- No central database or automatic cross-device syncing.
- No live AI assistant.
- No secure API keys.
- No live opening hours, weather, transport or booking data.

Do not publish passport information, medical details, payment data or private booking documents in this repository.

## Edit the customer trip

Replace the contents of `data/trip.json` using `TRIP-SCHEMA.md` as a guide. Keep every day ID and activity ID unique.

For a different customer, the safest prototype workflow is to duplicate this repository into a separate private working repository, replace the trip data, review it, and then publish only information you are comfortable making accessible by URL. GitHub Pages is not a secure customer portal.

## Preview locally

A service worker requires a local web server; opening `index.html` directly as a file is not enough.

Using Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files, including the hidden `.github` folder.
3. Commit them to the `main` branch.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. Open the **Actions** tab and check that the deployment completes.
7. Open the generated Pages URL on your phone.
8. On Android/Chrome, use the Install button or browser menu. On iPhone/Safari, use Share → Add to Home Screen.

## Updating a published customer trip

Edit `data/trip.json` and commit the change. The workflow republishes the app. Increase `CACHE_VERSION` in `sw.js` when changing core app files or when you need all cached assets refreshed.

## Data warning

Saved activities, completion status and notes are stored in `localStorage`. They do not automatically transfer to another device. The traveller can export this information from the Info screen.
