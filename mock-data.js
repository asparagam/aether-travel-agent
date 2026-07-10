const travelDestinations = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    tagline: "Temples, Gardens & Ancient Traditions",
    description: "Immerse yourself in Japan's cultural heart. Kyoto features thousands of classical Buddhist temples, gardens, imperial palaces, Shinto shrines, and traditional wooden houses.",
    rating: 4.9,
    reviews: 1420,
    duration: "7 Days",
    price: 1850,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
    flights: [
      { id: "fl-ky-1", airline: "Japan Airlines", flightNo: "JL-061", departure: "11:30 AM", duration: "11h 20m", type: "Non-stop", price: 920 },
      { id: "fl-ky-2", airline: "All Nippon Airways", flightNo: "NH-011", departure: "1:45 PM", duration: "11h 45m", type: "Non-stop", price: 980 },
      { id: "fl-ky-3", airline: "Singapore Airlines", flightNo: "SQ-012", departure: "8:10 AM", duration: "14h 10m", type: "1 Stop (SIN)", price: 780 }
    ],
    hotels: [
      { id: "ht-ky-1", name: "The Thousand Kyoto", stars: 5, rating: 4.8, pricePerNight: 280, description: "A stylish, eco-conscious sanctuary located right next to Kyoto Station, blending modern comfort with timeless Zen aesthetics.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-ky-2", name: "Hoshinoya Kyoto", stars: 5, rating: 4.9, pricePerNight: 550, description: "A luxurious riverside retreat in Arashiyama, accessible only by a scenic 15-minute boat ride up the Oi River.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-ky-3", name: "Gion Sano Ryokan", stars: 3, rating: 4.5, pricePerNight: 120, description: "A charming, family-run traditional inn offering classic tatami mat rooms in the historic heart of the Gion geisha district.", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=600&auto=format&fit=crop" }
    ],
    activities: [
      { day: 1, time: "09:00 AM", title: "Fushimi Inari Shrine Hike", description: "Walk through the iconic thousands of vermilion torii gates stretching up Mount Inari.", cost: 0 },
      { day: 2, time: "10:00 AM", title: "Kinkaku-ji (Golden Pavilion)", description: "Visit the stunning Zen temple whose top two floors are completely covered in gold leaf.", cost: 25 },
      { day: 3, time: "02:00 PM", title: "Traditional Tea Ceremony", description: "Experience a private, authentic Matcha tea preparation ceremony in a historic Gion townhouse.", cost: 65 },
      { day: 4, time: "09:00 AM", title: "Arashiyama Bamboo Grove Tour", description: "Walk the towering bamboo paths and visit the nearby Tenryu-ji temple gardens.", cost: 15 },
      { day: 5, time: "06:00 PM", title: "Pontocho Alley Food Tour", description: "Sample local delicacies like Kyoto-style sushi, yakitori, and sake in a lantern-lit alleyway.", cost: 95 },
      { day: 6, time: "11:00 AM", title: "Kiyomizu-dera Temple Visit", description: "Explore the historic temple and enjoy panoramic views of Kyoto from its massive wooden stage.", cost: 20 },
      { day: 7, time: "10:00 AM", title: "Souvenir Shopping & Departure", description: "Browse traditional crafts and sweets in Higashiyama district before checking out.", cost: 0 }
    ]
  },
  {
    id: "amalfi",
    name: "Amalfi Coast",
    country: "Italy",
    tagline: "Dramatic Cliffs & Mediterranean Romance",
    description: "One of Europe's most breathtaking coastal stretches. The Amalfi Coast features sheer cliffs rising from an azure sea, pastel-colored fishing villages, and terraced lemon groves.",
    rating: 4.8,
    reviews: 980,
    duration: "5 Days",
    price: 2100,
    image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1200&auto=format&fit=crop",
    flights: [
      { id: "fl-am-1", airline: "ITA Airways", flightNo: "AZ-610", departure: "4:20 PM", duration: "9h 40m", type: "Non-stop (NAP)", price: 850 },
      { id: "fl-am-2", airline: "Lufthansa", flightNo: "LH-324", departure: "9:05 AM", duration: "12h 15m", type: "1 Stop (FRA)", price: 680 },
      { id: "fl-am-3", airline: "Delta Air Lines", flightNo: "DL-112", departure: "6:30 PM", duration: "10h 10m", type: "Non-stop (FCO)", price: 990 }
    ],
    hotels: [
      { id: "ht-am-1", name: "Hotel Santa Caterina", stars: 5, rating: 4.9, pricePerNight: 480, description: "A late 19th-century liberty-style villa immersed in the beautiful scenery of the Amalfi Coast, offering private beach access.", image: "https://images.unsplash.com/photo-1540554157563-3c3f4e991557?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-am-2", name: "Hotel Poseidon Positano", stars: 4, rating: 4.7, pricePerNight: 320, description: "Perched high in Positano, this beautiful hotel features a panoramic terrace with stunning views of the colorful town and sea.", image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-am-3", name: "B&B La Valle delle Ferriere", stars: 3, rating: 4.6, pricePerNight: 140, description: "A cozy, family-operated bed & breakfast located in a peaceful lemon valley just a short walk from Amalfi center.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop" }
    ],
    activities: [
      { day: 1, time: "02:00 PM", title: "Amalfi Town Walking Tour", description: "Visit the stunning St. Andrew's Cathedral and wander through medieval vaulted alleys.", cost: 15 },
      { day: 2, time: "09:00 AM", title: "Path of the Gods Hike", description: "Hike the legendary clifftop trail from Bomerano to Nocelle with jaw-dropping coastal panoramas.", cost: 35 },
      { day: 3, time: "10:00 AM", title: "Private Capri Boat Excursion", description: "Sail around the island of Capri, swim in hidden coves, and visit the iconic Faraglioni rocks.", cost: 180 },
      { day: 4, time: "03:00 PM", title: "Limoncello Making & Tasting", description: "Tour a historic terraced lemon grove and learn the traditional family art of crafting Limoncello.", cost: 50 },
      { day: 5, time: "10:00 AM", title: "Positano Beach Day", description: "Spend your final day relaxing on the volcanic sands of Spiaggia Grande, surrounded by cliffside houses.", cost: 30 }
    ]
  },
  {
    id: "reykjavik",
    name: "Reykjavik & Southern Coast",
    country: "Iceland",
    tagline: "Fire, Ice & Celestial Light Show",
    description: "Explore a dramatic landscape of active volcanoes, gushing geysers, massive glaciers, black sand beaches, and the ethereal Northern Lights.",
    rating: 4.7,
    reviews: 730,
    duration: "6 Days",
    price: 1650,
    image: "https://images.unsplash.com/photo-1504829857797-ddff28127792?q=80&w=1200&auto=format&fit=crop",
    flights: [
      { id: "fl-rey-1", airline: "Icelandair", flightNo: "FI-614", departure: "2:10 PM", duration: "5h 50m", type: "Non-stop", price: 420 },
      { id: "fl-rey-2", airline: "PLAY Airlines", flightNo: "OG-121", departure: "7:00 PM", duration: "6h 10m", type: "Non-stop", price: 310 },
      { id: "fl-rey-3", airline: "United Airlines", flightNo: "UA-902", departure: "8:30 PM", duration: "6h 00m", type: "Non-stop", price: 490 }
    ],
    hotels: [
      { id: "ht-rey-1", name: "The Retreat at Blue Lagoon", stars: 5, rating: 4.9, pricePerNight: 850, description: "A luxurious award-winning resort carved directly into an 800-year-old lava flow, with private geothermal lagoon access.", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-rey-2", name: "Sand Hotel by Keahotels", stars: 4, rating: 4.6, pricePerNight: 240, description: "A boutique hotel situated on Reykjavik's main shopping street, offering sleek Nordic design and an artisan bakery next door.", image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-rey-3", name: "Kex Hostel & Guesthouse", stars: 3, rating: 4.4, pricePerNight: 90, description: "Housed in an old biscuit factory, this industrial-chic social hub features vintage decor, shared rooms, and a lively bar.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop" }
    ],
    activities: [
      { day: 1, time: "05:00 PM", title: "Blue Lagoon Soak", description: "Bathe in the mineral-rich, milky-blue geothermal waters to recover from your flight.", cost: 95 },
      { day: 2, time: "09:00 AM", title: "Golden Circle Classic Tour", description: "Visit the roaring Gullfoss Waterfall, the Geysir geothermal field, and Thingvellir National Park.", cost: 75 },
      { day: 3, time: "08:30 AM", title: "Glacier Hike & Ice Cave Tour", description: "Strap on crampons and explore the crevasses and natural blue ice tunnels of Vatnajökull glacier.", cost: 140 },
      { day: 4, time: "10:00 AM", title: "South Coast Waterfalls & Black Sand Beach", description: "See Seljalandsfoss, Skógafoss, and the basalt columns at Reynisfjara black sand beach.", cost: 90 },
      { day: 5, time: "09:00 PM", title: "Northern Lights Jeep Safari", description: "Head out into the dark countryside with expert guides to hunt for the elusive Aurora Borealis.", cost: 110 },
      { day: 6, time: "10:00 AM", title: "Reykjavik Street Art & Coffee Walk", description: "Explore the colorful capital's design shops, murals, and micro-roasteries before your flight home.", cost: 35 }
    ]
  },
  {
    id: "patagonia",
    name: "Patagonia Wilderness",
    country: "Chile / Argentina",
    tagline: "Jagged Peaks & Ancient Glaciers",
    description: "Journey to the edge of the world. Patagonia features spectacular glacial valleys, soaring granite spires (Torres del Paine), and pristine turquoise lakes.",
    rating: 4.9,
    reviews: 540,
    duration: "8 Days",
    price: 2450,
    image: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?q=80&w=1200&auto=format&fit=crop",
    flights: [
      { id: "fl-pa-1", airline: "LATAM Airlines", flightNo: "LA-532", departure: "9:15 PM", duration: "14h 45m", type: "1 Stop (SCL)", price: 1150 },
      { id: "fl-pa-2", airline: "Aerolíneas Argentinas", flightNo: "AR-1300", departure: "11:55 PM", duration: "16h 10m", type: "2 Stops (EZE, FTE)", price: 990 }
    ],
    hotels: [
      { id: "ht-pa-1", name: "Explora Torres del Paine", stars: 5, rating: 4.9, pricePerNight: 980, description: "A world-class all-inclusive eco-lodge set in the center of Torres del Paine National Park, right on the shores of Lake Pehoé.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-pa-2", name: "EcoCamp Patagonia", stars: 4, rating: 4.8, pricePerNight: 420, description: "Stay in fully sustainable dome suites nestled in the wilderness, featuring glass ceilings to watch the southern stars.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-pa-3", name: "Hotel Las Torres Patagonia", stars: 4, rating: 4.6, pricePerNight: 260, description: "A rustic, comfortable estancia-style hotel located directly at the trailhead of the famous Towers hike.", image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?q=80&w=600&auto=format&fit=crop" }
    ],
    activities: [
      { day: 1, time: "03:00 PM", title: "National Park Arrival & Briefing", description: "Settle into your lodge and review the trail maps with your certified wilderness guides.", cost: 0 },
      { day: 2, time: "07:30 AM", title: "Base of the Towers Hike", description: "Hike through Ascencio Valley to the spectacular glacial lake sitting directly under the three granite towers.", cost: 80 },
      { day: 3, time: "09:00 AM", title: "French Valley Trek", description: "Walk beneath hanging glaciers and listen to avalanches rumbling in the distance.", cost: 60 },
      { day: 4, time: "10:00 AM", title: "Grey Glacier Boat Navigation", description: "Sail through floating blue icebergs to the massive face of Grey Glacier.", cost: 120 },
      { day: 5, time: "08:30 AM", title: "Perito Moreno Ice Trekking", description: "Crossover into Argentina to walk on one of the world's only advancing glaciers.", cost: 210 },
      { day: 6, time: "09:30 AM", title: "Condor Lookout Horseback Ride", description: "Ride with local Baqueano cowboys to scenic lookouts over Nordenskjöld Lake.", cost: 95 },
      { day: 7, time: "11:00 AM", title: "Sarmiento Lake Fauna Trail", description: "Spot herds of guanacos, Darwin's rheas, and potentially a Chilean puma.", cost: 40 },
      { day: 8, time: "09:00 AM", title: "Wilderness Checkout & Departure", description: "Pack bags and bid farewell to Patagonia before transfer to Punta Arenas airport.", cost: 0 }
    ]
  },
  {
    id: "petra",
    name: "Ancient Petra & Wadi Rum",
    country: "Jordan",
    tagline: "Lost Cities & Martian Deserts",
    description: "Walk back in time through the rose-red sandstone cliffs of Petra, then sleep under the star-swept skies of the Martian-like Wadi Rum desert.",
    rating: 4.8,
    reviews: 640,
    duration: "5 Days",
    price: 1550,
    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1200&auto=format&fit=crop",
    flights: [
      { id: "fl-pe-1", airline: "Royal Jordanian", flightNo: "RJ-264", departure: "10:30 PM", duration: "10h 20m", type: "Non-stop", price: 820 },
      { id: "fl-pe-2", airline: "Turkish Airlines", flightNo: "TK-812", departure: "1:15 PM", duration: "13h 40m", type: "1 Stop (IST)", price: 690 }
    ],
    hotels: [
      { id: "ht-pe-1", name: "Mövenpick Resort Petra", stars: 5, rating: 4.7, pricePerNight: 220, description: "Located directly at the entrance of the ancient site of Petra, featuring rich oriental carvings and hand-painted tapestries.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop" },
      { id: "ht-pe-2", name: "Palmer Dome Camp Wadi Rum", stars: 4, rating: 4.8, pricePerNight: 180, description: "Luxurious bubble tents offering air conditioning, en-suite bathrooms, and panoramic view of the red sandstone monoliths.", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop" }
    ],
    activities: [
      { day: 1, time: "08:00 AM", title: "Siq & Treasury Explorations", description: "Walk through the winding high-walled Siq canyon to catch your first glimpse of the rose-red Treasury.", cost: 70 },
      { day: 2, time: "06:00 AM", title: "Ad Deir (Monastery) Trail Hike", description: "Climb the 850 rock-cut stairs early in the morning to view the magnificent Monastery monument.", cost: 30 },
      { day: 3, time: "02:00 PM", title: "Wadi Rum 4x4 Desert Jeep Safari", description: "Ride through red sand dunes, inspect prehistoric Nabataean rock inscriptions, and view sandstone arches.", cost: 60 },
      { day: 4, time: "08:30 PM", title: "Bedouin Feast & Desert Stargazing", description: "Enjoy a traditional Zarb dinner cooked under the desert sands, followed by crystal-clear stargazing.", cost: 45 },
      { day: 5, time: "10:00 AM", title: "Dead Sea Float & Departure", description: "Relax and float in the hypersaline waters of the Dead Sea before heading to Amman airport.", cost: 50 }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { travelDestinations };
} else {
  window.travelDestinations = travelDestinations;
}
