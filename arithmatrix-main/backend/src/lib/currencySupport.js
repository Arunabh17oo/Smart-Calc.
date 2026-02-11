const FRANKFURTER_CURRENCIES_URL = 'https://api.frankfurter.app/currencies';
const CURRENCY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 5 * 60 * 1000;

export const FALLBACK_SUPPORTED_CURRENCIES = [
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'USDT',
  'ZAR'
];

let cachedCurrencies = FALLBACK_SUPPORTED_CURRENCIES;
let cacheExpiry = 0;

function normalizeCurrencyCodes(codes) {
  return Array.from(
    new Set(
      codes
        .map((code) => String(code || '').trim().toUpperCase())
        .filter((code) => /^[A-Z]{3,4}$/.test(code))
    )
  ).sort();
}

function buildSupportedCurrencyList(codes) {
  return normalizeCurrencyCodes([...FALLBACK_SUPPORTED_CURRENCIES, ...codes, 'USDT']);
}

async function fetchFrankfurterCurrencies() {
  const response = await fetch(FRANKFURTER_CURRENCIES_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch supported currencies.');
  }

  const data = await response.json();
  return Object.keys(data || {});
}

export async function getSupportedCurrencies() {
  if (Date.now() < cacheExpiry && cachedCurrencies.length > 0) {
    return cachedCurrencies;
  }

  try {
    const liveCurrencies = await fetchFrankfurterCurrencies();
    cachedCurrencies = buildSupportedCurrencyList(liveCurrencies);
    cacheExpiry = Date.now() + CURRENCY_CACHE_TTL_MS;
    return cachedCurrencies;
  } catch (_error) {
    if (!cachedCurrencies.length) {
      cachedCurrencies = FALLBACK_SUPPORTED_CURRENCIES;
    }
    cacheExpiry = Date.now() + FAILURE_RETRY_MS;
    return cachedCurrencies;
  }
}

export async function getSupportedCurrencySet() {
  return new Set(await getSupportedCurrencies());
}
