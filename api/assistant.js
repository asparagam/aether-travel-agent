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
      systemInstruction: `You are Aether, an elegant and knowledgeable AI Travel assistant.
      You help users search flights, find hotels, check weather, and customize itineraries.
      Keep answers concise and luxurious. Whenever the user asks for flights, hotels, or weather, execute the matching tool immediately.`
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
  let content = "I can guide you on your custom holiday. Would you like to check flights, find luxury lodging, or review local weather forecast?";
  
  if (lastMsg.includes('flight') || lastMsg.includes('fly')) {
    content = "I've queried flight offers. We have direct flight suggestions with Aether Airways starting from $520. Let me know if you would like me to map out a flight booking.";
  } else if (lastMsg.includes('hotel') || lastMsg.includes('stay')) {
    content = "I retrieved several hotel suggestions for you, notably the Aether Palace Resort ($320/night) with private spa amenities. Would you like to select this accommodation?";
  } else if (lastMsg.includes('weather')) {
    content = "The current weather forecast is clear and sunny (22°C), ideal for outdoor sightseeing. Should I recommend local tours?";
  }

  res.status(200).json({
    role: 'assistant',
    content
  });
}
