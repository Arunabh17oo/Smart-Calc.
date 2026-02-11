import { Router } from 'express';

const STOCK_WATCHLIST = [
  { ticker: 'RELIANCE.NS', symbol: 'RELIANCE', name: 'Reliance', emoji: '🛢️', logoDomain: 'ril.com' },
  { ticker: 'TCS.NS', symbol: 'TCS', name: 'Tata Consultancy', emoji: '💻', logoDomain: 'tcs.com' },
  { ticker: 'HDFCBANK.NS', symbol: 'HDFCBANK', name: 'HDFC Bank', emoji: '🏦', logoDomain: 'hdfcbank.com' },
  { ticker: 'INFY.NS', symbol: 'INFY', name: 'Infosys', emoji: '🧠', logoDomain: 'infosys.com' },
  { ticker: 'ICICIBANK.NS', symbol: 'ICICIBANK', name: 'ICICI Bank', emoji: '💳', logoDomain: 'icicibank.com' },
  { ticker: 'ITC.NS', symbol: 'ITC', name: 'ITC', emoji: '🏭', logoDomain: 'itcportal.com' },
  { ticker: 'SBIN.NS', symbol: 'SBIN', name: 'State Bank of India', emoji: '🏛️', logoDomain: 'sbi.co.in' },
  { ticker: 'LT.NS', symbol: 'LT', name: 'Larsen & Toubro', emoji: '🏗️', logoDomain: 'larsentoubro.com' },
  { ticker: 'BHARTIARTL.NS', symbol: 'BHARTIARTL', name: 'Bharti Airtel', emoji: '📶', logoDomain: 'airtel.in' },
  { ticker: 'HINDUNILVR.NS', symbol: 'HINDUNILVR', name: 'Hindustan Unilever', emoji: '🧴', logoDomain: 'unilever.com' }
];

const STOCKS_SOURCE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const STOCKS_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CRYPTO_SOURCE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd,inr';

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstFinite(...values) {
  for (const value of values) {
    const parsed = toFiniteNumber(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function computeChangePercent(price, previousClose) {
  const parsedPrice = toFiniteNumber(price);
  const parsedPrevious = toFiniteNumber(previousClose);

  if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedPrevious) || parsedPrevious === 0) {
    return null;
  }

  return ((parsedPrice - parsedPrevious) / parsedPrevious) * 100;
}

function getGrowwUrl(symbol) {
  return `https://groww.in/us-stocks/${String(symbol || '').toLowerCase()}`;
}

async function fetchStockQuoteMap() {
  const symbols = STOCK_WATCHLIST.map((stock) => stock.ticker).join(',');
  const params = new URLSearchParams({ symbols });
  const response = await fetch(`${STOCKS_SOURCE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch live stock prices.');
  }

  const payload = await response.json();
  const results = payload?.quoteResponse?.result || [];
  return new Map(results.map((item) => [String(item.symbol || '').toUpperCase(), item]));
}

async function fetchStockChartSnapshot(symbol) {
  const params = new URLSearchParams({
    interval: '2m',
    range: '1d'
  });

  const response = await fetch(`${STOCKS_CHART_URL}/${symbol}?${params.toString()}`);
  if (!response.ok) return null;

  const payload = await response.json();
  const meta = payload?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const price = firstFinite(meta.regularMarketPrice, meta.chartPreviousClose, meta.previousClose);
  const previousClose = firstFinite(meta.previousClose, meta.chartPreviousClose);
  const changePercent = computeChangePercent(price, previousClose);

  return {
    symbol,
    price,
    changePercent,
    currency: meta.currency || 'USD',
    marketTime: meta.regularMarketTime ? new Date(Number(meta.regularMarketTime) * 1000).toISOString() : null
  };
}

async function fetchStockChartFallback(symbols) {
  const snapshots = await Promise.allSettled(symbols.map((symbol) => fetchStockChartSnapshot(symbol)));
  const bySymbol = new Map();

  for (const result of snapshots) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    bySymbol.set(result.value.symbol, result.value);
  }

  return bySymbol;
}

async function fetchStocks() {
  let quoteBySymbol = new Map();

  try {
    quoteBySymbol = await fetchStockQuoteMap();
  } catch (_error) {
    // Fall back to chart snapshots below if batch quote endpoint is unavailable.
  }

  const baseStocks = STOCK_WATCHLIST.map((stock) => {
    const quote = quoteBySymbol.get(stock.ticker);
    const price = firstFinite(
      quote?.regularMarketPrice,
      quote?.postMarketPrice,
      quote?.preMarketPrice,
      quote?.bid,
      quote?.ask
    );
    const changePercent = firstFinite(
      quote?.regularMarketChangePercent,
      computeChangePercent(price, quote?.regularMarketPreviousClose)
    );

    return {
      symbol: stock.symbol,
      tickerSymbol: stock.ticker,
      name: quote?.shortName || quote?.longName || stock.name,
      emoji: stock.emoji,
      logoUrl: `https://logo.clearbit.com/${stock.logoDomain}`,
      growwUrl: getGrowwUrl(stock.symbol),
      currency: quote?.currency || 'INR',
      marketTime: quote?.regularMarketTime
        ? new Date(Number(quote.regularMarketTime) * 1000).toISOString()
        : null,
      price,
      changePercent
    };
  });

  const symbolsMissingPrice = baseStocks
    .filter((stock) => !Number.isFinite(stock.price))
    .map((stock) => stock.tickerSymbol);

  if (symbolsMissingPrice.length) {
    const chartFallback = await fetchStockChartFallback(symbolsMissingPrice);

    for (const stock of baseStocks) {
      if (Number.isFinite(stock.price)) continue;
      const fallback = chartFallback.get(stock.tickerSymbol);
      if (!fallback) continue;
      stock.price = fallback.price;
      stock.changePercent = Number.isFinite(stock.changePercent)
        ? stock.changePercent
        : fallback.changePercent;
      stock.currency = stock.currency || fallback.currency || 'INR';
      stock.marketTime = stock.marketTime || fallback.marketTime || null;
    }
  }

  const hasAnyLivePrice = baseStocks.some((stock) => Number.isFinite(stock.price));
  if (!hasAnyLivePrice) {
    throw new Error('Failed to fetch live stock prices.');
  }

  return baseStocks.map(({ tickerSymbol, ...stock }) => stock);
}

async function fetchCryptoRates() {
  const response = await fetch(CRYPTO_SOURCE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch live crypto prices.');
  }

  const payload = await response.json();

  const usdtUsd = toFiniteNumber(payload?.tether?.usd);
  const usdtInr = toFiniteNumber(payload?.tether?.inr);
  const btcUsd = toFiniteNumber(payload?.bitcoin?.usd);
  const btcInr = toFiniteNumber(payload?.bitcoin?.inr);
  const btcUsdt = Number.isFinite(btcUsd) && Number.isFinite(usdtUsd) && usdtUsd > 0 ? btcUsd / usdtUsd : null;

  return {
    usdt: {
      usd: usdtUsd,
      inr: usdtInr
    },
    btc: {
      usd: btcUsd,
      usdt: btcUsdt,
      inr: btcInr
    }
  };
}

export const marketRouter = Router();

marketRouter.get('/overview', async (_req, res, next) => {
  try {
    const [stocksResult, cryptoResult] = await Promise.allSettled([fetchStocks(), fetchCryptoRates()]);

    const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value : [];
    const crypto = cryptoResult.status === 'fulfilled' ? cryptoResult.value : null;

    const warnings = [];

    if (stocksResult.status === 'rejected') {
      warnings.push(stocksResult.reason?.message || 'Stock prices are temporarily unavailable.');
    }
    if (cryptoResult.status === 'rejected') {
      warnings.push(cryptoResult.reason?.message || 'Crypto prices are temporarily unavailable.');
    }

    if (!stocks.length && !crypto) {
      return res.status(502).json({
        message: 'Unable to fetch live market prices right now.'
      });
    }

    return res.json({
      updatedAt: new Date().toISOString(),
      refreshHintSec: 30,
      stocks,
      crypto,
      warnings
    });
  } catch (error) {
    next(error);
  }
});
