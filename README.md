# ✈️ Voyara AI Travel Planner

An AI-powered travel planning platform that helps users discover destinations, compare flights, find hotels, generate personalized itineraries, and plan trips through an intelligent AI travel concierge.

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Google Antigravity](https://img.shields.io/badge/Google%20Antigravity-4285F4?style=for-the-badge)](https://deepmind.google/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **🤖 AI Travel Concierge**: Context-aware chat assistant loaded with custom planning tools.
- **✈️ Smart Flight Recommendations**: Live flight comparisons, carrier codes, and rates.
- **🏨 Hotel Discovery**: High-end stay matches, luxury resorts, and custom amenities.
- **🗺️ Interactive Maps**: POI map indicators displaying hotels, airport transits, restaurants, and sights.
- **📅 AI Itinerary Planner**: Dynamic calendar scheduler showing details and events.
- **🎙️ Voice Assistant**: Immersive Speech Recognition loop with status indicator highlights.
- **🌤️ Weather Insights**: Live local destination weather reports built into detail cards.
- **💰 Budget Estimation**: Complete breakdowns including transit, food, and activities.
- **❤️ Favorites**: Bookmark and catalog target vacation destinations.
- **🌙 Dark & Light Mode**: Fluid design-system themes with glassmorphism overlays.
- **📱 Fully Responsive**: Premium experience optimized across mobile, tablet, and desktop views.
- **♿ WCAG 2.2 AA Accessible**: Semantic markup, keyboard access, and aria descriptors.

---

## 🛠 Built With

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Vanilla CSS
- **Backend Services**: Supabase Data layers
- **AI Core**: Google Gemini, Google Antigravity Agent framework
- **Maps**: Leaflet, OpenStreetMap
- **Deployment**: Vercel Routing & Serverless Functions

---

## 🤖 AI Features & Voyara Assistant

The Voyara Assistant acts as a personal luxury travel concierge:
- **Conversational Concierge**: Processes natural chat instructions to query flights, hotels, and maps.
- **Context memory**: Remembers travel destination, budget restrictions, dietary requests, and dates.
- **Speech Recognition**: Custom Voice loop containing clear status animations:
  - `🎤 Listening` (purple) ➔ `🧠 Thinking` (cyan) ➔ `🗣 Speaking` (green active waveform pulse).
- **Interactive Cards**: Generates cost logs, stays list view grids, and flight rows instead of plain text.

---

## 🚀 Getting Started

### Installation
1. Clone the project repository:
   ```bash
   git clone https://github.com/asparagam/aether-travel-agent.git
   cd aether-travel-agent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the local development server:
   ```bash
   npm run dev
   ```

### Production Build
1. Build the production package bundle:
   ```bash
   npm run build
   ```
2. Static distribution builds will be compiled to the `dist/` directory.

---

## 📁 Project Structure

```text
├── api/                  # Vercel Serverless Functions
│   ├── assistant.js      # Gemini Chat Concierge endpoint
│   ├── flights.js        # Flight recommendations database
│   ├── hotels.js         # Hotel recommendations database
│   └── weather.js        # Live weather lookup API
├── auth/                 # Authentication callback pages
├── app.js                # Frontend Controller logic
├── index.html            # Main markup page
├── mock-data.js          # Mock catalog data
└── style.css             # Vanilla CSS design tokens & layouts
```

---

## 🎯 Future Roadmap

- [ ] Supabase User login integration
- [ ] Real-time flight search APIs ( Sabre / Amadeus )
- [ ] Direct hotel reservation checkouts
- [ ] Calendar sync (.ics export)
- [ ] Offline itinerary access
- [ ] Social travel sharing links

---

## 🚀 Live Demo

The application is deployed on Vercel:
👉 **[travel-agent-inky.vercel.app](https://travel-agent-inky.vercel.app/)**

Repository link:
👉 **[github.com/asparagam/aether-travel-agent](https://github.com/asparagam/aether-travel-agent)**

---

## 🤝 Contributing

1. Fork this Repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👩‍💻 Author

**Fatma Doğan Seçkin**  
*Founder & Senior Product Designer*  
**Space UX Design**  
- Website: [spaceuxdesign.design](https://www.spaceuxdesign.design)  
- LinkedIn: [fatmaseckin](https://www.linkedin.com/in/fatmaseckin/)  

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!
