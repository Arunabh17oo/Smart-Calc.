import { Router } from 'express';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];

export const currencyRouter = Router();

currencyRouter.get('/supported', (_req, res) => {
  res.json({ currencies: SUPPORTED_CURRENCIES });
});

currencyRouter.get('/convert', async (req, res, next) => {
  try {
    const amount = Number(req.query.amount);
    const from = String(req.query.from || '').toUpperCase();
    const to = String(req.query.to || '').toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    if (!from || !to) {
      return res.status(400).json({ message: 'from and to currency are required.' });
    }

    const params = new URLSearchParams({
      amount: String(amount),
      from,
      to
    });

    const response = await fetch(`https://api.frankfurter.app/latest?${params.toString()}`);

    if (!response.ok) {
      return res.status(502).json({ message: 'Failed to fetch live rates from Frankfurter.' });
    }

    const data = await response.json();
    const converted = data?.rates?.[to];

    if (!Number.isFinite(converted)) {
      return res.status(502).json({ message: 'Conversion failed for selected currency pair.' });
    }

    return res.json({
      amount,
      from,
      to,
      converted,
      date: data.date
    });
  } catch (error) {
    next(error);
  }
});
