# ArithMatrix (Smart-Calc)

ArithMatrix is a full-stack web application combining a smart scientific calculator with voice input, camera OCR math solving, currency conversion (USDT/fiat), weather lookup, AI assistant chat, live market data, live news feeds, and persistent operation history.

## 🚀 Key Features

- Smart expression calculator: scientific and advanced (trig, log, exp, factorial, combinations/permutations, gcd/lcm, roots, hyperbolic functions, constants, unit conversions)
- Voice calculator: speech recognition with optional text-to-speech
- Camera math solver: Tesseract.js OCR + AI reasoning pipeline
- Currency converter: fiat ↔︎ USDT plus cross pairs, live rates
- Weather lookup: current conditions + 5-day forecast
- AI assistant: chat, math solving, contextual help
- Live market panel: top stock quotes, BTC/USDT/USD/INR cards, auto/manual refresh, marquee ticker
- Persistent history (MongoDB): categories `BASIC`, `VOICE`, `CAMERA`, `CURRENCY`
- Route-aware news feeds per tool tab for context-driven content

## 🧩 Tech Stack

- Frontend: React 18, Vite, React Router, Tesseract.js, modern hooks/components
- Backend: Node.js, Express, Mongoose, CORS, dotenv
- Database: MongoDB (local or Atlas)
- External integrations:
  - Frankfurter (fiat conversion)
  - CoinGecko (crypto rates)
  - Open-Meteo (weather + geocoding)
  - Yahoo Finance (stock quotes)
  - Google News RSS (topic news)
  - LibreTranslate / MyMemory (translations)
  - Optional OpenAI / Hugging Face (assistant fallback)

## 📁 Repository Structure

- `frontend/`: React app
  - `src/pages/`: route pages (Basic, Voice, Camera, Currency, Weather, Assistant, History, Admin)
  - `src/components/`: shared UI
  - `src/api/`: API clients
- `backend/`: Express API server
  - `src/routes/`: route modules (currency, weather, market, news, history, assistant, translate, health)
  - `src/models/`: Mongoose models
  - `src/config/`: DB configuration

## 🛠️ Prerequisites

- Node.js 18+
- npm
- MongoDB (local instance or Atlas URI)

## ⚙️ Setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment variables

#### Backend (`backend/.env`)

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/arithmatrix
CLIENT_ORIGIN=http://localhost:5173

# Optional AI keys
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=HuggingFaceTB/SmolLM3-3B:hf-inference
```

#### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

> If AI keys are missing, the app will run with local/fallback assistant behavior.

### 3) Start local development

Terminal 1 (backend):

```bash
cd backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`

## 🧪 Run tests (if available)

- No test suite is baked in by default. Add unit/integration tests in `frontend/src` and `backend/src` as needed.

## 🏗️ Production build

```bash
cd frontend
npm run build

cd ../backend
npm start
```

## 🌐 API Endpoints

Base URL: `http://localhost:5001/api`

- `GET /health`
- `GET /history?source=BASIC|VOICE|CAMERA|CURRENCY`
- `POST /history` (save entry)
- `DELETE /history/:id`
- `DELETE /history?source=...`
- `GET /currency/supported`
- `GET /currency/convert?amount=100&from=USDT&to=INR`
- `GET /weather/current?city=London`
- `GET /market/overview`
- `GET /news/feed?topic=upcoming-tech|voice|camera|currency|weather|history|assistant`
- `GET /translate/supported`
- `POST /translate`
- `POST /assistant/chat`
- `POST /assistant/solve-math`

## 🔍 Notes

- Voice and camera features require secure context (`https`) or `localhost`.
- Third-party provider limits may affect market, news, translation, weather, and currency data.
- Stock logos are fetched via Clearbit and may fall back to emoji badges.

## 📝 Optional enhancements

- Add user authentication (JWT / sessions)
- Persist user preferences in DB
- Add admin role toggles and panel gating
- Add UI for offline mode and rate-limit warnings

## 📜 License

Private/internal project by default. Add a license file if open-source release is desired.
