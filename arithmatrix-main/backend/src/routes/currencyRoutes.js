import { Router } from 'express';
import { getSupportedCurrencies, getSupportedCurrencySet } from '../lib/currencySupport.js';

const USDT_RATE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,inr';
const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.app/latest';

export const currencyRouter = Router();

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function convertFiatCurrency({ amount, from, to }) {
  if (from === to) {
    return {
      converted: amount,
      date: new Date().toISOString().slice(0, 10)
    };
  }

  const params = new URLSearchParams({
    amount: String(amount),
    from,
    to
  });

  const response = await fetch(`${FRANKFURTER_LATEST_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch live rates from Frankfurter.');
  }

  const data = await response.json();
  const converted = data?.rates?.[to];

  if (!Number.isFinite(converted)) {
    throw new Error('Conversion failed for selected currency pair.');
  }

  return {
    converted,
    date: data.date
  };
}

async function fetchUsdtRates() {
  const response = await fetch(USDT_RATE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch live USDT rates.');
  }

  const data = await response.json();
  const usdRate = toFiniteNumber(data?.tether?.usd);
  const inrRate = toFiniteNumber(data?.tether?.inr);

  if (!Number.isFinite(usdRate) || !Number.isFinite(inrRate) || usdRate <= 0 || inrRate <= 0) {
    throw new Error('USDT rates are unavailable right now.');
  }

  return {
    usdRate,
    inrRate,
    date: new Date().toISOString().slice(0, 10)
  };
}

async function convertCurrency({ amount, from, to }) {
  if (from !== 'USDT' && to !== 'USDT') {
    return convertFiatCurrency({ amount, from, to });
  }

  const usdt = await fetchUsdtRates();

  if (from === 'USDT') {
    if (to === 'USD') {
      return { converted: amount * usdt.usdRate, date: usdt.date };
    }
    if (to === 'INR') {
      return { converted: amount * usdt.inrRate, date: usdt.date };
    }

    const usdAmount = amount * usdt.usdRate;
    const fiatConversion = await convertFiatCurrency({ amount: usdAmount, from: 'USD', to });
    return { converted: fiatConversion.converted, date: fiatConversion.date || usdt.date };
  }

  if (to === 'USDT') {
    if (from === 'USD') {
      return { converted: amount / usdt.usdRate, date: usdt.date };
    }
    if (from === 'INR') {
      return { converted: amount / usdt.inrRate, date: usdt.date };
    }

    const usdConversion = await convertFiatCurrency({ amount, from, to: 'USD' });
    return {
      converted: usdConversion.converted / usdt.usdRate,
      date: usdConversion.date || usdt.date
    };
  }

  return convertFiatCurrency({ amount, from, to });
}

currencyRouter.get('/supported', async (_req, res, next) => {
  try {
    const currencies = await getSupportedCurrencies();
    res.json({ currencies });
  } catch (error) {
    next(error);
  }
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

    const supportedCurrencies = await getSupportedCurrencySet();
    if (!supportedCurrencies.has(from) || !supportedCurrencies.has(to)) {
      return res.status(400).json({ message: 'Unsupported currency selected.' });
    }

    const conversion = await convertCurrency({ amount, from, to });

    return res.json({
      amount,
      from,
      to,
      converted: conversion.converted,
      date: conversion.date
    });
  } catch (error) {
    next(error);
  }
});
