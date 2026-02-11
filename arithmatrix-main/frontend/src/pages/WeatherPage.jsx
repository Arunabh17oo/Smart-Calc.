import { useState } from 'react';
import { fetchWeatherByCity } from '../api/weatherApi.js';

const QUICK_CITIES = ['New York', 'San Francisco', 'Chicago', 'Mumbai', 'London', 'Tokyo'];

function formatDate(dateText) {
  const date = new Date(dateText);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function WeatherPage() {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);

  async function loadWeather(targetCity) {
    const query = String(targetCity || city).trim();
    if (!query) {
      setError('Please enter a city name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchWeatherByCity(query);
      setWeather(data);
      setCity(query);
    } catch (err) {
      setError(err.message || 'Failed to load weather data');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Weather Info</h2>
      </div>

      <p className="hint-text">Search current weather and 5-day forecast by city.</p>

      <div className="weather-search-row">
        <input
          type="text"
          className="text-input weather-city-input"
          placeholder="Enter city (e.g. New York)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              loadWeather();
            }
          }}
        />
        <button type="button" className="action-btn" onClick={() => loadWeather()} disabled={loading}>
          {loading ? 'Loading...' : 'Get Weather'}
        </button>
      </div>

      <div className="filter-row">
        {QUICK_CITIES.map((item) => (
          <button key={item} type="button" className="pill-btn" onClick={() => loadWeather(item)}>
            {item}
          </button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {weather ? (
        <div className="weather-content">
          <article className="weather-current-card">
            <p className="weather-location">
              {weather.location.name}
              {weather.location.state ? `, ${weather.location.state}` : ''}
              {weather.location.country ? `, ${weather.location.country}` : ''}
            </p>
            <p className="weather-main-temp">
              {weather.current.temperature}
              {weather.currentUnits.temperature}
            </p>
            <p className="weather-text">{weather.current.weatherText}</p>

            <div className="weather-stats-grid">
              <div className="weather-stat-item">
                <span>Feels Like</span>
                <strong>
                  {weather.current.feelsLike}
                  {weather.currentUnits.feelsLike}
                </strong>
              </div>
              <div className="weather-stat-item">
                <span>Humidity</span>
                <strong>
                  {weather.current.humidity}
                  {weather.currentUnits.humidity}
                </strong>
              </div>
              <div className="weather-stat-item">
                <span>Wind</span>
                <strong>
                  {weather.current.windSpeed}
                  {weather.currentUnits.windSpeed}
                </strong>
              </div>
              <div className="weather-stat-item">
                <span>Precipitation</span>
                <strong>
                  {weather.current.precipitation}
                  {weather.currentUnits.precipitation}
                </strong>
              </div>
            </div>
          </article>

          <div className="weather-forecast-grid">
            {weather.forecast.map((day) => (
              <article key={day.date} className="weather-forecast-card">
                <p className="weather-forecast-date">{formatDate(day.date)}</p>
                <p className="weather-forecast-text">{day.weatherText}</p>
                <p className="weather-forecast-temp">
                  {day.maxTemp}
                  {weather.dailyUnits.maxTemp} / {day.minTemp}
                  {weather.dailyUnits.minTemp}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
