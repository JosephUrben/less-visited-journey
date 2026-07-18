(() => {
  const patch = {
    schemaVersion: 3,
    journeyId: "JRN-0001",
    productType: "Personalised Reviewed Journey",
    demo: true,
    journeyVersion: 3,
    journeyStatus: "awaiting_approval",
    lastReviewedAt: "2026-07-18",
    reviewedBy: "Less Visited editorial review",
    travellerName: "Sample Traveller",
    destination: "Chile",
    tripTitle: "Chile, Seen Differently",
    subtitle: "Santiago and Valparaíso",
    startDate: "2026-10-12",
    endDate: "2026-10-16",
    timezone: "America/Santiago",
    currency: "CLP",
    intro: "A five-day journey through contemporary Chilean culture, neighbourhood life, memory, responsible food and the urban viewpoints of Santiago and Valparaíso.",
    routeOverview: "Begin slowly in Lastarria, connect central Santiago with Bellavista and Cerro San Cristóbal, then give the Museo de la Memoria proper time before travelling to the coast. Valparaíso is explored through connected hillside zones rather than repeated climbs between the port and the cerros.",
    verificationNote: "Core venues and official visitor information were reviewed on 18 July 2026. Weather, temporary closures, restaurant service and Valparaíso ascensor operation must be checked again shortly before each visit.",
    preparationChecklist: [
      { id: "prep-approval", label: "Approve this journey or request final changes" },
      { id: "prep-insurance", label: "Confirm travel insurance and current Chile entry requirements" },
      { id: "prep-bus", label: "Book the Santiago–Valparaíso bus and confirm the departure terminal" },
      { id: "prep-restaurants", label: "Reserve priority restaurants and confirm current service hours" },
      { id: "prep-neruda", label: "Recheck La Chascona and La Sebastiana notices near the visit date" },
      { id: "prep-ascensores", label: "Check which Valparaíso ascensores are operating" },
      { id: "prep-maps", label: "Download offline map areas for Santiago and Valparaíso" },
      { id: "prep-companion", label: "Open every companion section once while online" }
    ],
    packingChecklist: [
      { id: "pack-layers", label: "Layers for Santiago evenings and changing coastal weather" },
      { id: "pack-shoes", label: "Shoes with grip for Valparaíso's steep and uneven streets" },
      { id: "pack-bottle", label: "Reusable water bottle" },
      { id: "pack-adapter", label: "Chile-compatible power adapter" },
      { id: "pack-daybag", label: "Secure lightweight day bag worn close to the body" },
      { id: "pack-cash", label: "Small cash for ascensores and minor purchases" }
    ],
    days: [
      {
        id: "day-1",
        date: "2026-10-12",
        location: "Santiago",
        theme: "Arrive gently and understand Lastarria",
        summary: "Settle in, make the companion work offline and begin with one compact cultural neighbourhood.",
        routeLogic: "Monday stays between the accommodation, GAM and Lastarria; no cross-city attraction is added after arrival.",
        activities: [
          {
            id: "a1", placeId: "pla-gam", time: "16:30", title: "GAM architecture and Lastarria orientation loop", category: "culture", type: "suggested",
            description: "Walk through GAM's public plazas and the José Ramón Gutiérrez connection into Lastarria, then continue through Plaza Mulato Gil and the quieter side streets.",
            duration: "75–90 min", travelTime: "Start near accommodation", cost: "Free", address: "Centro Cultural Gabriela Mistral, Av. Libertador Bernardo O'Higgins 227, Santiago",
            practicalNote: "The public architecture works well on Monday even though several exhibition rooms normally close on Mondays.",
            alternative: "If arrival is late or wet, limit the route to GAM's covered areas and one block of Lastarria.",
            whySelected: "GAM gives immediate context for Chile's recent cultural and political history without overloading arrival day.",
            verificationStatus: "confirmed", verificationSource: "GAM official hours", verificationUrl: "https://gam.cl/es/experiencia/horarios/", recheck: "Check the GAM calendar for temporary access changes."
          },
          {
            id: "a2", placeId: "pla-chipe", time: "19:30", title: "Chilean–Peruvian pisco dinner at Chipe Libre", category: "food", type: "food",
            description: "Use Chipe Libre's pisco focus as an introduction to a cross-border spirit tradition, pairing a tasting or alcohol-free option with dinner.",
            duration: "90 min", travelTime: "Within Lastarria", cost: "Allow CLP 30,000–45,000", address: "José Victorino Lastarria 282, Santiago",
            practicalNote: "Reserve and confirm Monday service; keep the return walk short.",
            alternative: "Bocanáriz at Lastarria 276 offers a Chilean wine-focused dinner nearby.",
            whySelected: "It is independent, rooted in a specific regional story and sits directly on the return route.",
            verificationStatus: "recheck", verificationSource: "Chipe Libre official website", verificationUrl: "https://www.chipe-libre.cl/en", recheck: "Confirm current Monday hours and reserve."
          }
        ]
      },
      {
        id: "day-2",
        date: "2026-10-13",
        location: "Santiago",
        theme: "Contemporary art, a poet's house and the city from above",
        summary: "Move from Lastarria into Bellavista and finish at Cerro San Cristóbal.",
        routeLogic: "MAVI UC and lunch remain in Lastarria; La Chascona and the Pío Nono funicular form one connected afternoon.",
        activities: [
          {
            id: "a3", placeId: "pla-mavi", time: "10:00", title: "MAVI UC, Plaza Mulato Gil and Bocanáriz lunch", category: "culture", type: "fixed",
            description: "Visit MAVI UC for contemporary Chilean visual art, pause in Plaza Mulato Gil, then use nearby Bocanáriz for lunch or a guided Chilean wine flight.",
            duration: "3 hours including lunch", travelTime: "Walk from Lastarria base", cost: "Check museum admission; lunch CLP 25,000–45,000", address: "José Victorino Lastarria 307, Santiago",
            practicalNote: "MAVI UC lists step-free access, a lift and accessible toilets. Reserve Bocanáriz if a structured tasting matters.",
            alternative: "Use GAM's visual-arts spaces if MAVI's current exhibition is not a good fit.",
            whySelected: "It foregrounds Chilean contemporary work and turns lunch into regional context without disrupting the route.",
            verificationStatus: "confirmed", verificationSource: "MAVI UC and Bocanáriz official sites", verificationUrl: "https://mavi.uc.cl/en/ubicacion-y-horarios/", recheck: "Review the exhibition programme and lunch booking."
          },
          {
            id: "a4", placeId: "pla-chascona", time: "14:30", title: "La Chascona: Neruda's Santiago house", category: "culture", type: "suggested",
            description: "Use the audio guide to connect the house's objects, architecture and biography rather than treating it only as decorative eccentricity.",
            duration: "75–90 min", travelTime: "20–25 min walk or short taxi", cost: "Official 2026 general admission listed as CLP 11,000", address: "Fernando Márquez de la Plata 0192, Providencia, Santiago",
            practicalNote: "Entry is normally by order of arrival; the foundation sometimes announces weather-related closures.",
            alternative: "If closed, spend longer at GAM or Centro Cultural La Moneda before the viewpoint.",
            whySelected: "Seeing La Chascona before La Sebastiana creates a useful two-house narrative across the journey.",
            verificationStatus: "recheck", verificationSource: "Fundación Pablo Neruda official information", verificationUrl: "https://fundacionneruda.org/en/opening-hours-and-information/", recheck: "Check same-day notices and ticket price."
          },
          {
            id: "a5", placeId: "pla-san-cristobal", time: "16:45", title: "Funicular to Cerro San Cristóbal for late light", category: "viewpoint", type: "suggested",
            description: "Ride from Pío Nono and use the summit viewpoints to identify central Santiago, eastern districts and the Andes when visibility allows.",
            duration: "90–120 min", travelTime: "5–10 min from La Chascona", cost: "Check current funicular ticket", address: "Pío Nono 485, Providencia, Santiago",
            practicalNote: "Plan the descent before the official early-evening closing time; visibility depends on weather and air quality.",
            alternative: "Use Cerro Santa Lucía for a shorter central viewpoint if the funicular is closed.",
            whySelected: "It is the clearest city-scale orientation point and naturally follows Bellavista.",
            verificationStatus: "weather", verificationSource: "Funicular Santiago official page", verificationUrl: "https://funicularsantiago.cl/en/", recheck: "Confirm hours, maintenance and visibility on the day."
          }
        ]
      },
      {
        id: "day-3",
        date: "2026-10-14",
        location: "Santiago → Valparaíso",
        theme: "Historical memory, then the coast",
        summary: "Give one important museum proper time before the intercity transfer.",
        routeLogic: "Visit Quinta Normal once, then use the confirmed bus terminal and go directly to the Valparaíso base.",
        activities: [
          {
            id: "a6", placeId: "pla-memory", time: "10:00", title: "Museo de la Memoria y los Derechos Humanos", category: "culture", type: "fixed",
            description: "Allow time for the testimony-led account of human-rights violations during the 1973–1990 dictatorship; do not add another major museum.",
            duration: "2–2.5 hours", travelTime: "Metro Line 5 to Quinta Normal", cost: "Free", address: "Matucana 501, Santiago",
            practicalNote: "The material is emotionally demanding, so build in a quiet break afterwards.",
            alternative: "If unexpectedly closed, use Centro Cultural La Moneda and leave for Valparaíso earlier.",
            whySelected: "A route explaining Chilean culture needs recent political history, not only attractive neighbourhoods.",
            verificationStatus: "confirmed", verificationSource: "Museo de la Memoria official visit page", verificationUrl: "https://mmdh.cl/visitanos", recheck: "Confirm no special closure."
          },
          {
            id: "a7", placeId: "pla-dimalow", time: "14:00", title: "Pre-booked bus and a short Cerro Alegre orientation", category: "transport", type: "fixed",
            description: "Follow the terminal printed on the ticket, keep it offline, check in at the Valparaíso base, then make one compact Paseo Dimalow orientation loop before dinner.",
            duration: "Transfer plus 60 min walk", travelTime: "Approx. 1 hr 30 min plus terminal transfers", cost: "Confirm fare", address: "Paseo Dimalow, Valparaíso",
            practicalNote: "Do not assume Santiago terminals are interchangeable. Finish the Valparaíso walk before quiet streets or darkness.",
            alternative: "If arrival is delayed or wet, go directly to dinner and save the route for Day 4.",
            whySelected: "The transfer timing protects the evening while still giving immediate hillside orientation.",
            verificationStatus: "booking", verificationSource: "Chile Travel route guidance", verificationUrl: "https://chile.travel/en/attractions/elevator-route/", recheck: "Confirm operator, terminal, traffic and local conditions."
          },
          {
            id: "a8", placeId: "pla-laconcepcion", time: "19:00", title: "Dinner at Restaurant La Concepción", category: "food", type: "food",
            description: "Use the bay view as part of the meal while prioritising Chilean ingredients and a comfortable return route.",
            duration: "90 min", travelTime: "Within Cerro Concepción", cost: "Allow CLP 35,000–55,000", address: "Papudo 541, Cerro Concepción, Valparaíso",
            practicalNote: "Reserve, confirm the kitchen closing time and return by a well-lit route or car.",
            alternative: "Fauna Restaurant on Paseo Dimalow is closer for a Cerro Alegre base.",
            whySelected: "It provides a destination-quality meal without sending the traveller back down to the port at night.",
            verificationStatus: "confirmed", verificationSource: "Restaurant La Concepción official site", verificationUrl: "https://www.restaurantlaconcepcion.cl/en/", recheck: "Confirm reservation and hours."
          }
        ]
      },
      {
        id: "day-4",
        date: "2026-10-15",
        location: "Valparaíso",
        theme: "Art, ascensores and responsible seafood",
        summary: "Follow one connected heritage route from the plan to Cerro Alegre and Concepción.",
        routeLogic: "Use El Peral if operating, then remain on the hills through Baburizza, lunch and the afternoon route.",
        activities: [
          {
            id: "a9", placeId: "pla-baburizza", time: "09:30", title: "Ascensor El Peral, Paseo Yugoslavo and Museo Baburizza", category: "culture", type: "fixed",
            description: "Begin near Plaza Sotomayor, use El Peral if operating, then visit Palacio Baburizza and read the relationship between hillside houses, port and bay.",
            duration: "2–2.5 hours", travelTime: "One lift or taxi climb", cost: "Carry small cash; foreign museum ticket listed as CLP 6,000", address: "Paseo Yugoslavo 176, Valparaíso",
            practicalNote: "Ascensor status can change quickly; use a taxi to Paseo Yugoslavo if necessary.",
            alternative: "If the museum is closed, continue through Paseo Yugoslavo and Cerro Alegre's galleries.",
            whySelected: "The museum and lift ground the day in Valparaíso's art and vertical urban history.",
            verificationStatus: "recheck", verificationSource: "Museo Baburizza and Chile Travel", verificationUrl: "https://www.museobaburizza.cl/visita/", recheck: "Check museum notices and same-day ascensor operation."
          },
          {
            id: "a10", placeId: "pla-trespeces", time: "12:30", title: "Responsible-seafood lunch at Tres Peces", category: "food", type: "food",
            description: "Arrive close to opening and choose from the day's catch, asking what came directly from partner fishing organisations.",
            duration: "75–90 min", travelTime: "15–20 min through the cerros", cost: "Allow CLP 22,000–35,000", address: "Concepción 261, Valparaíso",
            practicalNote: "Current service is Wednesday to Sunday lunchtime and tables are generally first come, first served.",
            alternative: "Restaurant La Concepción offers reservations and a broader menu nearby.",
            whySelected: "Its direct relationship with fishing organisations creates a strong local and responsible-sourcing reason.",
            verificationStatus: "confirmed", verificationSource: "Tres Peces official website", verificationUrl: "https://trespeces.cl/", recheck: "Check the weekly menu and service guidance."
          },
          {
            id: "a11", placeId: "pla-cerros", time: "14:30", title: "Cerro Concepción and Alegre slow route", category: "culture", type: "suggested",
            description: "Link Paseo Gervasoni, the Lutheran church exterior, Paseo Atkinson, Pasaje Gálvez and Paseo Dimalow without trying to photograph every mural.",
            duration: "2.5–3 hours", travelTime: "Continuous hillside walk", cost: "Free; allow for coffee", address: "Paseo Gervasoni, Valparaíso",
            practicalNote: "Steep, uneven surfaces and many stairs; use operating ascensores, taxis or colectivos to reduce climbing.",
            alternative: "Shorten to Gervasoni–Atkinson–Dimalow if energy, weather or street conditions change.",
            whySelected: "These connected spaces show how architecture, migration history, murals and viewpoints overlap.",
            verificationStatus: "weather", verificationSource: "Chile Travel Valparaíso itinerary", verificationUrl: "https://chile.travel/en/itineraries/tour-the-hills-of-valparaiso-2-day-itinerary/", recheck: "Review weather and local conditions; finish on an active return route."
          }
        ]
      },
      {
        id: "day-5",
        date: "2026-10-16",
        location: "Valparaíso",
        theme: "Cerro Bellavista and a calm departure",
        summary: "Use the final morning for one distinctive house and a selected public-art route.",
        routeLogic: "Travel uphill once to La Sebastiana, descend only if conditions suit, then protect the luggage and departure buffer.",
        activities: [
          {
            id: "a12", placeId: "pla-sebastiana", time: "10:00", title: "La Sebastiana and Museo a Cielo Abierto", category: "culture", type: "fixed",
            description: "Use the audio guide to compare La Sebastiana with La Chascona, then follow only a comfortable section of Cerro Bellavista's original open-air mural route.",
            duration: "2–2.5 hours", travelTime: "Taxi or colectivo uphill", cost: "House admission listed as CLP 11,000", address: "Ricardo de Ferrari 692, Valparaíso",
            practicalNote: "Leave luggage securely at the accommodation; the foundation can close houses during severe weather.",
            alternative: "If closed, use the mural route and revisit a saved Cerro Alegre place.",
            whySelected: "It completes the two-house narrative and contrasts a curated mural project with the previous day's street art.",
            verificationStatus: "recheck", verificationSource: "Fundación Neruda and Chile Travel", verificationUrl: "https://fundacionneruda.org/en/opening-hours-and-information/", recheck: "Check same-day weather notices and opening."
          },
          {
            id: "a13", placeId: "pla-departure", time: "13:00", title: "Collect luggage and protect the departure buffer", category: "practical", type: "task",
            description: "Return to the accommodation, review traffic and terminal conditions, and leave with a generous margin for the onward booking.",
            duration: "Flexible", travelTime: "Work backwards from the ticket", cost: "Transport dependent", address: "Terminal Rodoviario de Valparaíso",
            practicalNote: "Do not add a final meal or viewpoint that puts the booking at risk.",
            whySelected: "The final day avoids treating departure time as usable sightseeing time.",
            verificationStatus: "booking", verificationSource: "Less Visited route review", recheck: "Confirm terminal, traffic, luggage collection and ticket."
          }
        ]
      }
    ],
    places: [
      { id: "pla-gam", name: "Centro Cultural Gabriela Mistral (GAM)", destination: "Santiago", neighbourhood: "Lastarria", category: "culture", description: "Contemporary culture, public architecture and recent Chilean history at the entrance to Lastarria.", practicalNote: "Exhibition-room schedules vary by day.", whySelected: "It gives the first walk cultural meaning without requiring a transfer.", verificationStatus: "confirmed", tags: ["nearby","culture","accessible","free","rainy-day"], scheduled: true, active: true, address: "Av. Libertador Bernardo O'Higgins 227, Santiago" },
      { id: "pla-chipe", name: "Chipe Libre", destination: "Santiago", neighbourhood: "Lastarria", category: "food", description: "An independent restaurant and pisco bar built around Chilean and Peruvian pisco regions.", practicalNote: "Reserve and confirm Monday service.", whySelected: "A specific regional story on the return route.", verificationStatus: "recheck", tags: ["nearby","food","evening"], scheduled: true, active: true, address: "José Victorino Lastarria 282, Santiago" },
      { id: "pla-mavi", name: "MAVI UC", destination: "Santiago", neighbourhood: "Lastarria", category: "culture", description: "Contemporary Chilean visual art and an archaeological room in Plaza Mulato Gil.", practicalNote: "Check the current exhibition programme.", whySelected: "It foregrounds Chilean contemporary work.", verificationStatus: "confirmed", tags: ["nearby","culture","accessible","rainy-day"], scheduled: true, active: true, address: "José Victorino Lastarria 307, Santiago" },
      { id: "pla-bocanariz", name: "Bocanáriz", destination: "Santiago", neighbourhood: "Lastarria", category: "food", description: "A Chilean wine bar and restaurant focused on producers, regions and guided tasting.", practicalNote: "Reserve for a structured tasting.", whySelected: "It turns lunch into regional context.", verificationStatus: "confirmed", tags: ["nearby","food","evening","rainy-day"], scheduled: true, active: true, address: "José Victorino Lastarria 276, Santiago" },
      { id: "pla-chascona", name: "La Chascona", destination: "Santiago", neighbourhood: "Bellavista", category: "culture", description: "Pablo Neruda's Santiago house at the foot of Cerro San Cristóbal.", practicalNote: "Check foundation notices on the day.", whySelected: "It creates a comparison with La Sebastiana.", verificationStatus: "recheck", tags: ["culture","rainy-day"], scheduled: true, active: true, address: "Fernando Márquez de la Plata 0192, Santiago" },
      { id: "pla-san-cristobal", name: "Cerro San Cristóbal funicular and summit", destination: "Santiago", neighbourhood: "Bellavista", category: "viewpoint", description: "A historic funicular route to broad views over Santiago and the Andes in clear conditions.", practicalNote: "Check visibility, maintenance and descent time.", whySelected: "The clearest city-scale orientation point.", verificationStatus: "weather", tags: ["viewpoints","outdoors"], scheduled: true, active: true, address: "Pío Nono 485, Santiago" },
      { id: "pla-santa-lucia", name: "Cerro Santa Lucía", destination: "Santiago", neighbourhood: "Centro", category: "viewpoint", description: "A shorter central viewpoint for a funicular closure or limited energy.", practicalNote: "Check access and closing time.", whySelected: "It preserves the viewpoint purpose with less travel.", verificationStatus: "recheck", tags: ["viewpoints","free","quick-stop"], scheduled: false, active: true, alternativeFor: "a5", bestFor: "A shorter central viewpoint.", address: "Cerro Santa Lucía, Santiago" },
      { id: "pla-memory", name: "Museo de la Memoria y los Derechos Humanos", destination: "Santiago", neighbourhood: "Quinta Normal", category: "culture", description: "A testimony-led museum addressing human-rights violations during Chile's dictatorship.", practicalNote: "Allow emotional space afterwards.", whySelected: "It gives the journey historical depth.", verificationStatus: "confirmed", tags: ["culture","accessible","rainy-day","free"], scheduled: true, active: true, address: "Matucana 501, Santiago" },
      { id: "pla-cclm", name: "Centro Cultural La Moneda", destination: "Santiago", neighbourhood: "Centro", category: "culture", description: "Exhibition, design, photography and heritage spaces beneath Plaza de la Ciudadanía.", practicalNote: "Some galleries recommend advance booking.", whySelected: "A strong indoor substitute for a closure.", verificationStatus: "confirmed", tags: ["culture","accessible","rainy-day"], scheduled: false, active: true, alternativeFor: "a6", bestFor: "An unexpected museum closure.", address: "Plaza de la Ciudadanía 26, Santiago" },
      { id: "pla-dimalow", name: "Paseo Dimalow", destination: "Valparaíso", neighbourhood: "Cerro Alegre", category: "viewpoint", description: "A compact hillside promenade with street art, bay views and the upper Reina Victoria area.", practicalNote: "Finish before the route quietens.", whySelected: "Immediate orientation without overfilling arrival evening.", verificationStatus: "weather", tags: ["nearby","viewpoints","culture","free","evening"], scheduled: true, active: true, address: "Paseo Dimalow, Valparaíso" },
      { id: "pla-laconcepcion", name: "Restaurant La Concepción", destination: "Valparaíso", neighbourhood: "Cerro Concepción", category: "food", description: "Chilean ingredients, wine and bay views in an 1880 hillside house.", practicalNote: "Reserve and plan a safe return.", whySelected: "A destination meal without returning to the lower city at night.", verificationStatus: "confirmed", tags: ["food","viewpoints","evening"], scheduled: true, active: true, address: "Papudo 541, Valparaíso" },
      { id: "pla-fauna", name: "Fauna Restaurant", destination: "Valparaíso", neighbourhood: "Cerro Alegre", category: "food", description: "A terrace restaurant on Paseo Dimalow with broad bay and hillside views.", practicalNote: "Confirm hours and reserve if needed.", whySelected: "A geographically sensible Cerro Alegre alternative.", verificationStatus: "recheck", tags: ["food","viewpoints","evening","nearby"], scheduled: false, active: true, alternativeFor: "a8", bestFor: "A closer dinner to Cerro Alegre.", address: "Paseo Dimalow 166, Valparaíso" },
      { id: "pla-baburizza", name: "Museo Baburizza and Ascensor El Peral", destination: "Valparaíso", neighbourhood: "Cerro Alegre", category: "culture", description: "The fine-arts museum in Palacio Baburizza, reached by El Peral when operating.", practicalNote: "Keep a taxi alternative for the ascensor.", whySelected: "Art and vertical urban history in one route.", verificationStatus: "recheck", tags: ["culture","viewpoints","rainy-day"], scheduled: true, active: true, address: "Paseo Yugoslavo 176, Valparaíso" },
      { id: "pla-trespeces", name: "Tres Peces", destination: "Valparaíso", neighbourhood: "Cerro Concepción", category: "food", description: "Responsible seafood sourced directly from fishing organisations and changed with availability.", practicalNote: "Arrive near opening; queues are possible.", whySelected: "A clear local and responsible-sourcing reason.", verificationStatus: "confirmed", tags: ["food","culture"], scheduled: true, active: true, address: "Concepción 261, Valparaíso" },
      { id: "pla-cerros", name: "Cerro Alegre and Cerro Concepción route", destination: "Valparaíso", neighbourhood: "Alegre / Concepción", category: "culture", description: "A connected route through Gervasoni, Atkinson, Pasaje Gálvez and Dimalow.", practicalNote: "Shorten freely and use taxis or lifts to reduce climbing.", whySelected: "Architecture, migration history, murals and viewpoints overlap here.", verificationStatus: "weather", tags: ["culture","viewpoints","free"], scheduled: true, active: true, address: "Paseo Gervasoni, Valparaíso" },
      { id: "pla-sebastiana", name: "La Sebastiana and Museo a Cielo Abierto", destination: "Valparaíso", neighbourhood: "Cerro Bellavista", category: "culture", description: "Neruda's view-oriented house paired with a selected section of the original open-air mural project.", practicalNote: "Check weather notices and leave luggage securely.", whySelected: "It completes the two-house narrative and adds a different public-art layer.", verificationStatus: "recheck", tags: ["culture","viewpoints","rainy-day","free"], scheduled: true, active: true, address: "Ricardo de Ferrari 692, Valparaíso" },
      { id: "pla-departure", name: "Valparaíso departure buffer", destination: "Valparaíso", neighbourhood: "Terminal area", category: "practical", description: "Protected time for luggage collection and onward transport.", practicalNote: "Work backwards from the confirmed ticket.", whySelected: "It prevents the itinerary failing at the final booking.", verificationStatus: "booking", tags: ["practical","quick-stop"], scheduled: true, active: true, address: "Terminal Rodoviario de Valparaíso" }
    ],
    map: {
      title: "Santiago to Valparaíso: neighbourhoods, memory and hillsides",
      summary: "The route concentrates Santiago around Lastarria, Bellavista and one western museum visit, then explores Valparaíso through connected hillside zones.",
      routeUrl: "https://www.google.com/maps/dir/?api=1&origin=Barrio+Lastarria,+Santiago,+Chile&destination=Cerro+Alegre,+Valpara%C3%ADso,+Chile&travelmode=transit",
      stops: [
        { name: "Barrio Lastarria", note: "Arrival base and cultural orientation", mapUrl: "https://www.google.com/maps/search/?api=1&query=Barrio+Lastarria+Santiago+Chile" },
        { name: "MAVI UC", note: "Contemporary Chilean art", mapUrl: "https://www.google.com/maps/search/?api=1&query=MAVI+UC+Santiago" },
        { name: "La Chascona", note: "Neruda house and Bellavista", mapUrl: "https://www.google.com/maps/search/?api=1&query=La+Chascona+Santiago" },
        { name: "Cerro San Cristóbal", note: "City-scale viewpoint", mapUrl: "https://www.google.com/maps/search/?api=1&query=Funicular+Santiago+Pio+Nono" },
        { name: "Museo de la Memoria", note: "Historical anchor before transfer", mapUrl: "https://www.google.com/maps/search/?api=1&query=Museo+de+la+Memoria+Santiago" },
        { name: "Paseo Yugoslavo", note: "Baburizza and Cerro Alegre", mapUrl: "https://www.google.com/maps/search/?api=1&query=Paseo+Yugoslavo+Valparaiso" },
        { name: "Cerro Concepción", note: "Connected heritage walk", mapUrl: "https://www.google.com/maps/search/?api=1&query=Paseo+Gervasoni+Valparaiso" },
        { name: "La Sebastiana", note: "Cerro Bellavista final morning", mapUrl: "https://www.google.com/maps/search/?api=1&query=La+Sebastiana+Valparaiso" }
      ]
    },
    practicalInfo: [
      { title: "Using the journey", items: ["Fixed items protect the route or a booking; suggested and optional items can flex.", "Open official-source checks shortly before visiting.", "Use Request changes before approval when pace, budget or interests do not fit."] },
      { title: "Valparaíso", items: ["Use taxis or colectivos to reduce steep climbs.", "Check ascensor operation and carry small cash.", "After dark, prefer active streets or secure transport."] }
    ],
    emergencyInfo: [
      "Ambulance in Chile: 131",
      "Fire service: 132",
      "Police emergency (Carabineros): 133",
      "For a serious incident, also contact the travel insurer and accommodation.",
      "Follow official evacuation instructions after an earthquake, tsunami warning or major weather emergency."
    ]
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const requestUrl = new URL(typeof input === "string" ? input : input.url, location.href);
    const isChileJourney = /\/data\/(?:trip|journeys\/(?:JRN-0001|chile-seen-differently))\.json$/.test(requestUrl.pathname);
    if (!isChileJourney || !response.ok) return response;

    try {
      const published = await response.clone().json();
      const enhanced = { ...published, ...patch };
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.delete("content-length");
      return new Response(JSON.stringify(enhanced), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };

  window.LESS_VISITED_JOURNEY_PATCH = patch;
})();
