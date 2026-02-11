import { request } from './http.js';

export const DEFAULT_CURRENCIES = [
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

export async function fetchCurrencies() {
  try {
    const data = await request('/currency/supported');
    return data.currencies || DEFAULT_CURRENCIES;
  } catch (_error) {
    return DEFAULT_CURRENCIES;
  }
}

export async function convertCurrency({ amount, from, to }) {
  const params = new URLSearchParams({
    amount: String(amount),
    from,
    to
  });

  return request(`/currency/convert?${params.toString()}`);
}
