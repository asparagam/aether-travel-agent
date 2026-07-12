import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body. messages array is required.' });
  }

  if (!apiKey) {
    return runMockChatResponse(messages, res);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are Voyara, an elegant, natural, and premium AI travel concierge (similar to ChatGPT, Google Gemini, and Perplexity).
      Keep your tone confident, proactive, conversational, and intelligent.
      Never use robotic canned phrases. Your goal is to guide the user towards booking their dream luxury getaway.
      Whenever a destination, stays, flights, or budgets are discussed, return a concise formatted layout summary using HTML cards, emoji lists, or breakdowns.
      Example Kyoto Overview:
      📍 Destination: Kyoto, Japan
      🌤 Weather: 22°C · Sunny this week
      ✈ Flights: Starting from $520
      🏨 Recommended Stay: Voyara Grand Sovereign ($320/night)
      💰 Estimated Trip Cost: Approximately $2,850 for 6 days.
      
      Always offer relevant links or actions. Keep responses short, premium, and structured.`
    });

    const geminiHistory = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'searchFlights',
            description: 'Search flights from origin (IATA code) to destination (IATA code) on departureDate (YYYY-MM-DD).',
            parameters: {
              type: 'OBJECT',
              properties: {
                origin: { type: 'STRING', description: 'IATA code of origin city/airport, e.g. LAX, LON, NYC' },
                destination: { type: 'STRING', description: 'IATA code of destination city/airport, e.g. TYO, PAR, REK' },
                departureDate: { type: 'STRING', description: 'Departure date YYYY-MM-DD' }
              },
              required: ['origin', 'destination', 'departureDate']
            }
          },
          {
            name: 'searchHotels',
            description: 'Search hotels in a city (IATA city code) for check-in and check-out dates.',
            parameters: {
              type: 'OBJECT',
              properties: {
                cityCode: { type: 'STRING', description: 'IATA code of the city, e.g. TYO, PAR, REK' },
                checkInDate: { type: 'STRING', description: 'Check-in YYYY-MM-DD' },
                checkOutDate: { type: 'STRING', description: 'Check-out YYYY-MM-DD' }
              },
              required: ['cityCode', 'checkInDate', 'checkOutDate']
            }
          },
          {
            name: 'getWeather',
            description: 'Get current weather conditions for a city.',
            parameters: {
              type: 'OBJECT',
              properties: {
                city: { type: 'STRING', description: 'City name' }
              },
              required: ['city']
            }
          }
        ]
      }
    ];

    let result = await model.generateContent({
      contents: geminiHistory,
      tools: tools
    });

    let response = result.response;
    let functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const args = call.args;
      let toolResult = null;

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const apiOrigin = `${protocol}://${host}`;

      if (call.name === 'searchFlights') {
        const resObj = await fetch(`${apiOrigin}/api/flights?origin=${args.origin}&destination=${args.destination}&departureDate=${args.departureDate}`);
        toolResult = await resObj.json();
      } else if (call.name === 'searchHotels') {
        const resObj = await fetch(`${apiOrigin}/api/hotels?cityCode=${args.cityCode}&checkInDate=${args.checkInDate}&checkOutDate=${args.checkOutDate}`);
        toolResult = await resObj.json();
      } else if (call.name === 'getWeather') {
        const resObj = await fetch(`${apiOrigin}/api/weather?city=${args.city}`);
        toolResult = await resObj.json();
      }

      const followUpHistory = [
        ...geminiHistory,
        {
          role: 'model',
          parts: [{ functionCall: { name: call.name, args } }]
        },
        {
          role: 'user',
          parts: [{ functionResponse: { name: call.name, response: { result: toolResult } } }]
        }
      ];

      result = await model.generateContent({
        contents: followUpHistory,
        tools: tools
      });

      response = result.response;
    }

    res.status(200).json({
      role: 'assistant',
      content: response.text()
    });

  } catch (err) {
    console.error('Gemini execution error, fallback to mock response:', err.message);
    return runMockChatResponse(messages, res);
  }
}

function runMockChatResponse(messages, res) {
  const lastMsg = messages[messages.length - 1].content.toLowerCase();
  
  // Array of dynamic welcome openings to avoid repetition
  const openings = [
    "Hi! 👋 I'm Voyara, your AI travel companion. Tell me where you'd like to go, and I'll build a personalized trip including flights, hotels, activities, weather, and estimated costs.",
    "Welcome back! Ready to plan your next adventure? I can compare flights, recommend hotels, optimize your itinerary, and even estimate your total travel budget.",
    "Let's plan something unforgettable. Where would you like to travel?"
  ];
  
  let content = openings[Math.floor(Math.random() * openings.length)];
  
  if (lastMsg.includes('kyoto') || lastMsg.includes('japan')) {
    content = `Kyoto is a fantastic choice, especially during spring and autumn.
<br><br>
Here's a quick overview:
<br><br>
📍 <strong>Destination</strong><br>Kyoto, Japan
<br><br>
🌤 <strong>Weather</strong><br>22°C · Sunny this week
<br><br>
✈ <strong>Flights</strong><br>Starting from $520
<br><br>
🏨 <strong>Recommended Stay</strong><br>Voyara Grand Sovereign ($320/night)
<br><br>
💰 <strong>Estimated Trip Cost</strong><br>Approximately $2,850 for 6 days including flights and accommodation.
<br><br>
Would you like me to build a complete itinerary?`;
  } else if (lastMsg.includes('hotel') || lastMsg.includes('stay') || lastMsg.includes('ryokan') || lastMsg.includes('lodging')) {
    content = `I found a hotel that matches your preferences:
<br><br>
🏨 <strong>Voyara Grand Sovereign</strong>
<br>
★★★★★ 4.9 · Central District
<br><br>
🍳 Free Breakfast · 💆 Spa & Wellness · ❌ Free Cancellation
<br>
💵 $320/night (Only 1.2 km from Kyoto city center)
<br><br>
Would you like to see photos, amenities, reviews, or book this hotel?`;
  } else if (lastMsg.includes('flight') || lastMsg.includes('fly') || lastMsg.includes('airfare')) {
    content = `I found the best option for your travel dates:
<br><br>
✈️ <strong>Voyara Premium Air</strong>
<br>
Departure: 09:00 AM
<br>
Duration: 6h 45m (Economy)
<br>
Price: $520
<br><br>
Would you like me to add this flight to your trip?`;
  } else if (lastMsg.includes('budget') || lastMsg.includes('cost') || lastMsg.includes('price') || lastMsg.includes('how much')) {
    content = `Here is the estimated cost breakdown for your trip:<br><br>
<strong>Estimated Cost:</strong><br>
✈️ Flights: $520<br>
🏨 Hotel: $320 × 6 nights = $1,920<br>
🍔 Food: ≈ $300<br>
🎟️ Activities: ≈ $250<br>
🚕 Transportation: ≈ $80<br>
────────────────────<br>
💰 <strong>Estimated Total: $3,070</strong><br><br>
I can also suggest ways to reduce your budget while keeping the same experience.`;
  }

  res.status(200).json({
    role: 'assistant',
    content
  });
}
