(() => {
  const PLACE_META = {
    "pla-gam": { latitude: -33.4431, longitude: -70.6408, imageUrl: "./assets/place-art/lastarria.svg", openingHours: "Mo-Su 09:00-22:00" },
    "pla-chipe": { latitude: -33.4386, longitude: -70.6404, imageUrl: "./assets/place-art/lastarria.svg", openingHours: "Mo-Su 12:30-23:30" },
    "pla-mavi": { latitude: -33.4381, longitude: -70.6408, imageUrl: "./assets/place-art/lastarria.svg", openingHours: "Tu-Su 10:00-18:00; Mo off" },
    "pla-bocanariz": { latitude: -33.4387, longitude: -70.6405, imageUrl: "./assets/place-art/lastarria.svg", openingHours: "Mo-Su 12:30-23:30" },
    "pla-chascona": { latitude: -33.4329, longitude: -70.6344, imageUrl: "./assets/place-art/santiago-hills.svg", openingHours: "Tu-Su 10:00-18:00; Mo off" },
    "pla-san-cristobal": { latitude: -33.4254, longitude: -70.6329, imageUrl: "./assets/place-art/santiago-hills.svg", openingHours: "Mo-Su 10:00-18:45" },
    "pla-santa-lucia": { latitude: -33.4404, longitude: -70.6439, imageUrl: "./assets/place-art/santiago-hills.svg", openingHours: "Mo-Su 09:00-19:00" },
    "pla-memory": { latitude: -33.4399, longitude: -70.6794, imageUrl: "./assets/place-art/memory.svg", openingHours: "Tu-Su 10:00-18:00; Mo off" },
    "pla-cclm": { latitude: -33.4431, longitude: -70.6535, imageUrl: "./assets/place-art/memory.svg", openingHours: "Tu-Su 10:00-19:30; Mo off" },
    "pla-dimalow": { latitude: -33.0444, longitude: -71.6256, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "24/7" },
    "pla-laconcepcion": { latitude: -33.0419, longitude: -71.6265, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "Mo-Sa 13:00-23:00; Su 13:00-18:00" },
    "pla-fauna": { latitude: -33.0443, longitude: -71.6262, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "Mo-Su 13:00-23:00" },
    "pla-baburizza": { latitude: -33.0398, longitude: -71.6282, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "Tu-Su 10:00-18:00; Mo off" },
    "pla-trespeces": { latitude: -33.0430, longitude: -71.6253, imageUrl: "./assets/place-art/coast.svg", openingHours: "We-Su 13:00-16:00; Mo-Tu off" },
    "pla-cerros": { latitude: -33.0420, longitude: -71.6265, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "24/7" },
    "pla-sebastiana": { latitude: -33.0474, longitude: -71.6200, imageUrl: "./assets/place-art/valparaiso.svg", openingHours: "Tu-Su 10:00-18:00; Mo off" },
    "pla-departure": { latitude: -33.0478, longitude: -71.6036, imageUrl: "./assets/place-art/coast.svg", openingHours: "24/7" }
  };

  const expandedPreparation = [
    { id: "prep-approval", label: "Approve this journey or request final changes" },
    { id: "prep-passport", label: "Check passport validity beyond the planned departure date" },
    { id: "prep-visa", label: "Recheck Chile entry and visa rules for every traveller's passport" },
    { id: "prep-insurance", label: "Buy travel insurance covering the route and upload the policy PDF" },
    { id: "prep-health", label: "Review vaccinations, prescriptions and any accessibility requirements" },
    { id: "prep-bus", label: "Book the Santiago–Valparaíso bus and confirm the exact terminal" },
    { id: "prep-restaurants", label: "Reserve priority restaurants and confirm current service hours" },
    { id: "prep-neruda", label: "Recheck La Chascona and La Sebastiana notices near the visit date" },
    { id: "prep-ascensores", label: "Check which Valparaíso ascensores are operating" },
    { id: "prep-money", label: "Prepare a card plus a small CLP cash reserve" },
    { id: "prep-maps", label: "Download offline map areas for Santiago and Valparaíso" },
    { id: "prep-companion", label: "Open every companion section once while online and run Live sync" }
  ];

  const expandedPacking = [
    { id: "pack-layers", label: "Light layers for Santiago and a warmer coastal layer for Valparaíso" },
    { id: "pack-rain", label: "Compact rain shell or umbrella for changeable coastal weather" },
    { id: "pack-shoes", label: "Shoes with grip for steep, uneven streets and stairs" },
    { id: "pack-bottle", label: "Reusable water bottle" },
    { id: "pack-adapter", label: "Chile-compatible power adapter" },
    { id: "pack-power", label: "Charged power bank and charging cable" },
    { id: "pack-daybag", label: "Secure lightweight day bag worn close to the body" },
    { id: "pack-cash", label: "Small cash for ascensores, tips and minor purchases" },
    { id: "pack-passport", label: "Printed passport photo-page copy stored separately" },
    { id: "pack-insurance", label: "Offline insurance policy and emergency-assistance number" },
    { id: "pack-medicine", label: "Prescription medicine in original packaging" },
    { id: "pack-sun", label: "Sun protection and sunglasses" }
  ];

  const guidedTours = [
    { id: "tour-gyg-santiago", provider: "GetYourGuide", title: "Santiago guided experiences", summary: "Walking tours, markets, wine experiences and day trips from Santiago.", url: "https://www.getyourguide.com/santiago-chile-l226/", area: "Santiago", affiliateReady: true },
    { id: "tour-viator-valparaiso", provider: "Viator", title: "Valparaíso and coastal tours", summary: "Guided hillside walks, street-art routes and Santiago–Valparaíso excursions.", url: "https://www.viator.com/Valparaiso/d22148-ttd", area: "Valparaíso", affiliateReady: true },
    { id: "tour-civitatis-chile", provider: "Civitatis", title: "Chile tours and free walking tours", summary: "English and Spanish tours, transfers and excursions with affiliate-link support.", url: "https://www.civitatis.com/en/chile/", area: "Chile", affiliateReady: true }
  ];

  const practicalDetails = {
    nationalityContext: "British citizen passport demonstration",
    visa: { status: "Visa not normally required for visits up to 90 days", detail: "Chile's authorities set and enforce the rules. Recheck for every traveller and passport type before departure.", sourceUrl: "https://www.gov.uk/foreign-travel-advice/chile/entry-requirements" },
    currency: { code: "CLP", name: "Chilean peso", detail: "Use cards for larger payments and carry a modest cash reserve for ascensores, tips and small businesses. Avoid displaying large amounts of cash." },
    emergency: [ { label: "Ambulance", number: "131" }, { label: "Fire", number: "132" }, { label: "Police", number: "133" } ],
    travelAdviceUrl: "https://www.gov.uk/foreign-travel-advice/chile",
    wisePartnerUrl: "https://wise.com/gb/affiliate-program/"
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const requestUrl = new URL(typeof input === "string" ? input : input.url, location.href);
    const isChileJourney = /\/data\/(?:trip|journeys\/(?:JRN-0001|chile-seen-differently))\.json$/.test(requestUrl.pathname);
    if (!isChileJourney || !response.ok) return response;
    try {
      const published = await response.clone().json();
      const places = (published.places || []).map((place) => ({ ...place, ...(PLACE_META[place.id] || {}) }));
      const byId = Object.fromEntries(places.map((place) => [place.id, place]));
      const days = (published.days || []).map((day) => ({ ...day, activities: (day.activities || []).map((activity) => ({ ...activity, latitude: activity.latitude ?? byId[activity.placeId]?.latitude, longitude: activity.longitude ?? byId[activity.placeId]?.longitude, imageUrl: activity.imageUrl || byId[activity.placeId]?.imageUrl, openingHours: activity.openingHours || byId[activity.placeId]?.openingHours })) }));
      const enhanced = {
        ...published,
        schemaVersion: Math.max(Number(published.schemaVersion || 0), 4),
        journeyVersion: Math.max(Number(published.journeyVersion || 0), 4),
        preparationChecklist: expandedPreparation,
        packingChecklist: expandedPacking,
        places,
        days,
        guidedTours,
        practicalDetails,
        liveData: {
          weatherLocations: [
            { id: "santiago", name: "Santiago", latitude: -33.4489, longitude: -70.6693, timezone: "America/Santiago" },
            { id: "valparaiso", name: "Valparaíso", latitude: -33.0472, longitude: -71.6127, timezone: "America/Santiago" }
          ],
          weatherProvider: "Open-Meteo",
          openingHoursProvider: "OpenStreetMap / Overpass"
        }
      };
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.delete("content-length");
      return new Response(JSON.stringify(enhanced), { status: response.status, statusText: response.statusText, headers });
    } catch {
      return response;
    }
  };
})();