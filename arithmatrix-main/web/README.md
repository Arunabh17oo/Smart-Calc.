# ArithMatrix Web (MERN)

This project now uses root-level folders for the web app:

## Structure

- `../frontend` - React (Vite) frontend
- `../backend` - Express + MongoDB API

## Features Implemented

- Basic calculator with expression evaluation and `%` behavior
- Voice calculator using browser speech recognition + optional TTS
- Camera calculator using OCR (`tesseract.js`) from uploaded/captured images
- Currency converter using Frankfurter live rates
- Weather search with current conditions and 5-day forecast
- AI assistant chat for math, currency, weather, and app help
- Central history for all modes in MongoDB with filter, delete, and clear

## Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI
- Optional: OpenAI API key (`OPENAI_API_KEY`) or Hugging Face key (`HUGGINGFACE_API_KEY`) for advanced assistant replies.

## Setup

### Optional one-command setup

```bash
cd web
npm install
npm run install:all
npm run dev
```

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Client runs on `http://localhost:5173` and talks to server at `http://localhost:5001`.

## API Endpoints

- `GET /api/health`
- `GET /api/history?source=BASIC|VOICE|CAMERA|CURRENCY`
- `POST /api/history`
- `DELETE /api/history/:id`
- `DELETE /api/history?source=...`
- `GET /api/currency/supported`
- `GET /api/currency/convert?amount=100&from=USD&to=INR`
- `GET /api/weather/current?city=New%20York`
- `POST /api/assistant/chat`
