import { getAmadeusToken } from './_utils.js';

export default async function handler(req, res) {
  const { cityCode = 'TYO', checkInDate, checkOutDate } = req.query;

  if (!checkInDate || !checkOutDate) {
    return res.status(400).json({ 
      error: 'Missing parameters. checkInDate (YYYY-MM-DD) and checkOutDate (YYYY-MM-DD) are required.' 
    });
  }

  try {
    const token = await getAmadeusToken();
    
    // Fetch hotel codes by City Code (limit to a narrow radius to get central hotels)
    const listUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode.toUpperCase()}&radius=5&radiusUnit=KM`;
    const listResponse = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let rawHotels = [];
    if (listResponse.ok) {
      const listData = await listResponse.json();
      rawHotels = listData.data || [];
    }

    // Fallback hotels if Amadeus has no listing for this IATA city code in the test environment
    if (rawHotels.length === 0) {
      rawHotels = [
        { hotelId: 'AEHOTEL1', name: 'VOYARA PALACE RESORT', geoCode: { latitude: 35.6895, longitude: 139.6917 } },
        { hotelId: 'AEHOTEL2', name: 'THE SKYLINE REGENCY', geoCode: { latitude: 35.6762, longitude: 139.6503 } },
        { hotelId: 'AEHOTEL3', name: 'GRAND CONCIERGE RESIDENCE', geoCode: { latitude: 35.6586, longitude: 139.7454 } }
      ];
    }

    const hotelPhotos = [
      'photo-1566073771259-6a8506099945', // Luxury lobby
      'photo-1582719508461-905c673771fd', // Luxury suite
      'photo-1540555700478-4be289fbecef', // Luxury pool
      'photo-1520250497591-112f2f40a3f4', // Premium resort
      'photo-1445019980597-93fa8acb246c'  // Premium room
    ];

    const amenitiesList = [
      'Free Wi-Fi', 'Spa & Wellness', 'Gym & Fitness Center', 
      '24-Hour Concierge', 'Rooftop Lounge', 'Fine Dining Restaurant'
    ];

    const hotels = rawHotels.slice(0, 5).map((hotel, idx) => {
      const rating = (4.4 + (idx * 0.12)).toFixed(1);
      const pricePerNight = Math.floor(Math.random() * 220) + 180; // $180 - $400
      const formattedName = hotel.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      return {
        id: hotel.hotelId,
        name: formattedName,
        rating: Math.min(parseFloat(rating), 5.0).toFixed(1),
        reviewsCount: 110 + (idx * 31),
        price: pricePerNight,
        currency: 'USD',
        latitude: hotel.geoCode?.latitude || 35.6895,
        longitude: hotel.geoCode?.longitude || 139.6917,
        image: `https://images.unsplash.com/${hotelPhotos[idx % hotelPhotos.length]}?auto=format&fit=crop&w=600&q=80`,
        amenities: amenitiesList.slice(0, 3 + (idx % 3)),
        description: `Unveil luxury at ${formattedName}. This property features state-of-the-art lodging, elegant rooms, and a prime location for travelers.`
      };
    });

    res.status(200).json(hotels);
  } catch (err) {
    console.error('Amadeus hotel list failed, sending fallbacks:', err.message);
    res.status(200).json([
      {
        id: 'fallback-hotel-emergency',
        name: 'Voyara Grand Sovereign',
        rating: '4.8',
        reviewsCount: 245,
        price: 320,
        currency: 'USD',
        latitude: 35.6895,
        longitude: 139.6917,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
        amenities: ['Free Wi-Fi', 'Spa & Wellness', 'Fine Dining Restaurant', '24-Hour Concierge'],
        description: 'An exceptional hotel experience with tailored concierge support, pool access, and proximity to all primary sights.'
      }
    ]);
  }
}
