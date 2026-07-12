# 🪐 Voyara AI Travel Planner

> An AI-powered travel planning platform that helps travelers discover destinations, compare flights, find hotels, build personalized itineraries, and interact with an intelligent AI travel concierge.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://travel-agent-inky.vercel.app/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **🌍 AI-Powered Travel Planning**: Curate, customize, and arrange high-end holidays with ease.
- **✈️ Smart Flight Recommendations**: Compare options, flight numbers, carriers, and rates instantly.
- **🏨 Luxury Hotel Recommendations**: Explore curated boutique stays, five-star resorts, and retreats.
- **🗺️ Interactive Destination Maps**: Beautiful Leaflet maps displaying custom local points of interest.
- **🤖 AI Travel Concierge**: Context-aware natural chatbot helper loaded with smart travel tools.
- **🎙️ Voice-Enabled Assistant**: Modern conversational loop (Listening ➔ Thinking ➔ Speaking ➔ Finished) with real-time SpeechRecognition.
- **📅 Intelligent Itinerary Generation**: Build daily agendas, schedules, and activities dynamically.
- **🌤️ Live Weather Insights**: Dynamic current forecasts integrated inside the explorer view.
- **💰 Travel Budget Estimation**: Detailed breakdowns including flights, lodging, activities, food, and transit.
- **❤️ Save Favorite Destinations**: Keep track of bookmarked locations.
- **🌙 Dark & Light Mode**: Fluid design-token shifts that look premium across both themes.
- **📱 Fully Responsive**: Flawless UX across desktop-app viewports, tablets, and mobile screens.
- **♿ WCAG 2.2 AA Accessibility**: Semantic HTML, screen-reader alt text labels, and keyboard-friendly buttons.
- **⚡ Modern Animations**: Glassmorphic overlays, card hover effects, and fade transitions.

---

## 📸 Screenshots

### Home Page
*Placeholder for Home Page Layout Screenshot*

### Explore Destinations
*Placeholder for Grid Destinations Search Screenshot*

### Destination Details
*Placeholder for Split Column Fixed Desktop Details View*

### AI Assistant
*Placeholder for Chat Assistant Drawer with dynamic POI map pins*

### Travel Planner
*Placeholder for Stepper Booking and Calendar Export View*

### Light & Dark Themes
*Placeholder for Light Mode / Dark Mode Theme Comparisons*

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Vanilla CSS |
| **Backend** | Supabase, Vercel Serverless Functions |
| **AI Engine** | Google Gemini (gemini-1.5-flash), AI Agent Architecture, Model Tools |
| **Mapping** | Leaflet, OpenStreetMap, CartoDB Tiles |
| **Deployment** | Vercel (Production Build & Domain Routing) |

---

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/asparagam/aether-travel-agent.git
   cd aether-travel-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server locally:
   ```bash
   npm run dev
   ```

### Production Build

1. Build the production output bundle:
   ```bash
   npm run build
   ```

2. The static files will compile into the `dist/` folder.

---

## 📁 Project Structure

```text
.
├── api/                  # Vercel Serverless API Functions
│   ├── _utils.js         # API utility helpers
│   ├── assistant.js      # Voyara AI Chatbot Concierge endpoint
│   ├── checkout.js       # Booking checkout and biometric verification
│   ├── flights.js        # Flight suggestions endpoint
│   ├── hotels.js         # Stays suggestions endpoint
│   └── weather.js        # Weather fetching endpoint
├── auth/                 # OAuth authentication handlers
│   └── callback/
│       └── index.html    # OAuth redirect handling
├── dist/                 # Compiled production distribution files
├── app.js                # Core frontend controller & application logic
├── index.html            # Main markup page
├── mock-data.js          # Mock database configuration
├── style.css             # Vanilla CSS design tokens & layout styles
├── package.json          # Node dependencies and scripts
└── vercel.json           # Vercel routing configurations
```

---

## 🤖 AI Features & Voyara Assistant

Voyara Assistant behaves like modern chat assistants (ChatGPT Voice, Gemini Live) delivering a premium concierge experience:

- **Natural Conversations**: Free-text queries that understand intent, retrieve recommendations, and format costs.
- **Voice Interactions**: Seamless speech recognition using Web Speech APIs with visual indicators representing status states:
  - `🎤 Listening`: Animated purple pulse.
  - `🧠 Thinking`: Rapid cyan pulse (hides incomplete text).
  - `🗣 Speaking`: Active green wave pulse with highlighting of the active chat bubble.
  - `✓ Finished`: Graceful return to idle.
- **Context-Aware Memory**: Stays, flights, destinations, budgets, and dietary specifications are retained during the conversation thread.
- **Interactive Travel Cards**: Rendered dynamically inside the chat interface for flights, stays, cost breakdowns, and maps.

---

## 🎯 Roadmap

- [x] Rebrand logo and design variables to **Voyara**
- [x] Create stable desktop-app fixed viewport details grid
- [x] Suppress internal agent execution trace logs from UI
- [x] Implement dynamic suggestion chips and voice status animations
- [ ] User authentication (Supabase Auth)
- [ ] Real-time flight APIs integration (Amadeus / Sabre)
- [ ] Live hotel booking APIs
- [ ] Calendar sync (.ics export integration)
- [ ] Offline travel mode support
- [ ] Multi-language translation support
- [ ] Social trip sharing features

---

## 📷 Demo

- **Production Live URL**: [travel-agent-inky.vercel.app](https://travel-agent-inky.vercel.app/)
- **Repository URL**: [github.com/asparagam/aether-travel-agent](https://github.com/asparagam/aether-travel-agent)

---

## 🤝 Contributing

We welcome contributions from senior developers and product designers!
1. Fork this Repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## 👩‍💻 Author

**Fatma Doğan Seçkin**  
*Founder & Senior Product Designer*  
 Space UX Design  
- [Website](https://www.spaceuxdesign.design)  
- [LinkedIn](https://www.linkedin.com/in/fatmaseckin/)  

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!
