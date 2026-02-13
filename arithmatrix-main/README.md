# ArithMatrix

ArithMatrix is a full-stack web app that combines a smart calculator with voice input, camera OCR solving, unit conversion, world constants sticky notes, currency conversion (including USDT), weather lookup, AI assistant chat, route-aware live news feeds, live market prices, subjective tests, and role-based account management.

This repository contains:
- `frontend`: React + Vite client
- `backend`: Express + MongoDB API server

## Features

- Expression calculator with scientific and advanced modes (trig, logs, powers, constants, factorial, nCr/nPr, gcd/lcm, roots, hyperbolic trig)
- Account system with:
  - Email/mobile signup + login
  - Google sign-in (OAuth/GIS)
  - Persistent local account/session mapping per login
  - Periodic login reminder popup for signed-out users (every 4 minutes)
- Role-based access controls:
  - `student`, `teacher`, and `admin` roles
  - Admin tab visibility only for admins
  - Admin route guarded from non-admin access
  - Admin panel with latest-signup-first view, role assignment, and user deletion (non-admin accounts only)
- Subjective Test module:
  - Teacher can create scheduled subjective forms with marks, timing, instructions, question text, and optional question PDF
  - Teacher authentication for test management via teacher email + passcode
  - Teacher can edit created tests and upload answer key
  - Student joins via join code, registers with name/email, and submits subjective answers
  - Anti-cheat protections during active test (copy/paste/context menu/shortcut blocking)
  - Proctor mode support (camera + mic + fullscreen lock checks)
  - Proctoring evidence upload and optional teacher email dispatch (server-side mail config)
  - Teacher grading with marks + remarks, and student result retrieval
- Dedicated Unit Converter tab with grouped conversion categories:
  - Basic units: length, area, volume, time
  - Temperature
  - Weight / mass
  - Compound units: speed, acceleration, force, pressure, energy, power, density, torque
- World Constants Board inside Units:
  - 60+ commonly used math/science constants
  - Sticky-note style cards
  - Filter + search by category, name, symbol, value, and unit
- Voice calculator using browser SpeechRecognition and optional TTS
- Camera math solver using Tesseract OCR + assistant-based step solution
- Currency converter with live rates and USDT support (`USDT -> USD`, `USDT -> INR`, and reverse/cross pairs)
- Weather search with current stats and 5-day forecast
- AI assistant for math, currency, weather, and app help
- Live market strip with top 10 popular stock quotes, BTC/USDT/USD/INR cards, manual refresh, auto refresh, and smooth marquee ticker
- ATS Score Checker page with JD-vs-resume scoring breakdown (keywords, skills, sections, formatting, impact, contact)
- Resume upload-to-text flow for ATS:
  - Image resumes scanned with OCR (Tesseract)
  - PDF content parsing with filtering to avoid raw `%PDF/obj/xref` noise in the Resume Text box
  - Resume text auto-clears 3 minutes after ATS score analysis
- History storage in MongoDB by source: `BASIC`, `VOICE`, `CAMERA`, `CURRENCY`
- Translation operations panel with top-bar jump button
- Footer with:
  - About section
  - Help section (support email)
  - Raise a Query quick contact button (mailto)
  - Contact form (email + query text) that opens a prefilled email draft
- Route-aware live news section shown below the active tool panel on every tab:
  - `/` -> Upcoming technologies
  - `/voice` -> Mobile phones and electronics
  - `/camera` -> Camera and imaging
  - `/unit` -> Upcoming technologies
  - `/currency` -> Currency and forex
  - `/weather` -> Weather events
  - `/history` -> Overall world news
  - `/assistant` -> AI assistant updates
- News caching and refresh flow:
  - Backend refreshes each topic feed every 2 hours
  - Frontend auto-refreshes based on server refresh interval and supports manual refresh

## Tech Stack

- Frontend: React 18, React Router, Vite, Tesseract.js
- Backend: Node.js, Express, Mongoose, CORS, dotenv
- Database: MongoDB
- External data providers/services: Frankfurter (fiat exchange), CoinGecko (USDT/BTC), Open-Meteo (weather/geocoding), Yahoo Finance (stocks), Google News RSS (news), LibreTranslate/MyMemory (translation), Google Identity Services (Google sign-in)

## Project Structure

- `frontend/src/pages`: route pages (`Basic`, `Subjective`, `Voice`, `Camera`, `Unit`, `Currency`, `ATS`, `Weather`, `Assistant`, `History`, `Admin`)
- `frontend/src/components`: reusable UI (`NavTabs`, `AssistantWidget`, `MarketPulseBar`, `TechNewsSection`, `TranslatePopup`, `SubjectiveTestPanel`)
- `frontend/src/admin`: admin role/user management UI
- `frontend/src/api`: HTTP clients for backend APIs
- `backend/src/routes`: API routes (`health`, `history`, `currency`, `weather`, `assistant`, `market`, `news`, `subjective`, `translate`)
- `backend/src/models`: MongoDB models (`HistoryEntry`, `SubjectiveTest`, `SubjectiveSubmission`)

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB (local or Atlas URI)

## Setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment

Backend (`backend/.env`):

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/arithmatrix
CLIENT_ORIGIN=http://localhost:5173

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=HuggingFaceTB/SmolLM3-3B:hf-inference
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=
```

If AI keys are empty, the app still runs using local/fallback assistant behavior.

For subjective proctoring email dispatch, backend can use either SMTP or Gmail app password:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

### 3) Run the app

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Support

- For help/issues: `Arunabh17oo@gmail.com`
- Footer contact actions open email compose with prefilled details.

## Build

Frontend production build:

```bash
cd frontend
npm run build
```

Backend production start:

```bash
cd backend
npm start
```

## API Overview

Base URL: `http://localhost:5001/api`

- `GET /health`
- `GET /history?source=BASIC|VOICE|CAMERA|CURRENCY`
- `POST /history`
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
- `POST /subjective/tests`
- `POST /subjective/teachers/login`
- `GET /subjective/tests/by-code/:joinCode`
- `POST /subjective/tests/:joinCode/register`
- `POST /subjective/tests/:joinCode/submit`
- `POST /subjective/tests/:joinCode/proctoring`
- `GET /subjective/tests/:joinCode/result?studentEmail=...`
- `GET /subjective/tests/:testId/manage?teacherPasscode=...`
- `PATCH /subjective/tests/:testId`
- `POST /subjective/tests/:testId/answer-key`
- `PATCH /subjective/submissions/:submissionId/grade`

## Notes

- Voice and camera features require secure context (`https`) or `localhost`.
- Market, news, translation, weather, and currency data depend on third-party APIs and may be rate-limited.
- Stock logos are fetched from Clearbit logo URLs and may fallback to emoji badges.
- History source values currently stored in MongoDB: `BASIC`, `VOICE`, `CAMERA`, `CURRENCY`.

## Recent Updates

Updated on **February 13, 2026**:
- Added modern login/signup modal with ArithMatrix branding and Google sign-in integration.
- Added admin-only navigation visibility and route protection for `/admin`.
- Added admin account management actions: latest-signup-first sorting, role assignment, and user deletion.
- Added dynamic nav-tab spacing based on visible tabs (no empty slot when Admin tab is hidden).
- Added Subjective test workflow enhancements (teacher management, grading, anti-cheat/proctoring flow, student result visibility).

Updated on **February 12, 2026**:
- ATS Score Checker now auto-clears Resume Text 3 minutes after score analysis completes.

Updated on **February 11, 2026**:
- Added ATS Score Checker route and nav tab link.
- Added ATS scoring engine with component-wise scoring and recommendation output.
- Added resume file upload scan support for ATS input.
- Fixed resume text issue where PDFs could appear as raw internal document structure by adding PDF-source detection and readable-text extraction/cleanup.

## License

Private/internal project unless you choose to add a license file.
