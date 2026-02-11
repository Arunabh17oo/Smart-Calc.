import { request } from './http.js';

export async function fetchWeatherByCity(city) {
  const params = new URLSearchParams({ city });
  return request(`/weather/current?${params.toString()}`);
}
