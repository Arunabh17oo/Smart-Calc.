import { Router } from 'express';

const WEATHER_CODE_TEXT = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

function weatherText(code) {
  return WEATHER_CODE_TEXT[Number(code)] || 'Unknown';
}

export const weatherRouter = Router();

weatherRouter.get('/current', async (req, res, next) => {
  try {
    const city = String(req.query.city || '').trim();

    if (!city) {
      return res.status(400).json({ message: 'city query is required.' });
    }

    const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geocodeUrl.searchParams.set('name', city);
    geocodeUrl.searchParams.set('count', '1');
    geocodeUrl.searchParams.set('language', 'en');
    geocodeUrl.searchParams.set('format', 'json');

    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) {
      return res.status(502).json({ message: 'Failed to fetch location data.' });
    }

    const geocodeData = await geocodeResponse.json();
    const place = geocodeData?.results?.[0];

    if (!place) {
      return res.status(404).json({ message: 'City not found.' });
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', String(place.latitude));
    forecastUrl.searchParams.set('longitude', String(place.longitude));
    forecastUrl.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
    );
    forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
    forecastUrl.searchParams.set('timezone', 'auto');
    forecastUrl.searchParams.set('forecast_days', '5');

    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      return res.status(502).json({ message: 'Failed to fetch weather data.' });
    }

    const forecastData = await forecastResponse.json();

    const current = forecastData?.current || {};
    const currentUnits = forecastData?.current_units || {};
    const daily = forecastData?.daily || {};
    const dailyUnits = forecastData?.daily_units || {};

    const dailyForecast = (daily.time || []).map((date, index) => ({
      date,
      maxTemp: daily.temperature_2m_max?.[index],
      minTemp: daily.temperature_2m_min?.[index],
      weatherCode: daily.weather_code?.[index],
      weatherText: weatherText(daily.weather_code?.[index])
    }));

    return res.json({
      location: {
        name: place.name,
        state: place.admin1 || '',
        country: place.country || '',
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: forecastData.timezone
      },
      current: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        weatherText: weatherText(current.weather_code),
        time: current.time
      },
      currentUnits: {
        temperature: currentUnits.temperature_2m,
        feelsLike: currentUnits.apparent_temperature,
        humidity: currentUnits.relative_humidity_2m,
        windSpeed: currentUnits.wind_speed_10m,
        precipitation: currentUnits.precipitation
      },
      dailyUnits: {
        maxTemp: dailyUnits.temperature_2m_max,
        minTemp: dailyUnits.temperature_2m_min
      },
      forecast: dailyForecast
    });
  } catch (error) {
    next(error);
  }
});
