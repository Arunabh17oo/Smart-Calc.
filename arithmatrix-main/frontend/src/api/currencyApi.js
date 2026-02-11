import { request } from './http.js';

const DEFAULT_CURRENCIES = ['USD', 'USDT', 'EUR', 'INR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];

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
