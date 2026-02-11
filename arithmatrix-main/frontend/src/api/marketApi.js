import { request } from './http.js';

export async function fetchMarketOverview() {
  return request('/market/overview');
}
