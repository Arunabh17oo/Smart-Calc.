import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDb } from './config/db.js';
import { assistantRouter } from './routes/assistantRoutes.js';
import { currencyRouter } from './routes/currencyRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { historyRouter } from './routes/historyRoutes.js';
import { weatherRouter } from './routes/weatherRoutes.js';

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/history', historyRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/assistant', assistantRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});

async function bootstrap() {
  try {
    await connectDb(MONGO_URI);
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
