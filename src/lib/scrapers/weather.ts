/**
 * National Weather Service scraper for Kendallville, IN (46755)
 * Uses the NWS JSON API — no scraping required, fully public/free.
 */
import axios from 'axios';
import type { ScrapedItem, WeatherData } from '@/types';
import { logger } from '../logger';

const NWS_POINTS_URL = 'https://api.weather.gov/points/41.4381,-85.2649';
const USER_AGENT = 'KendallvilleDaily/1.0 (contact@kendallvilledaily.com)';

export async function scrapeWeather(): Promise<ScrapedItem[]> {
  try {
    logger.info('Scraping NWS weather for Kendallville, IN...');

    // Step 1: Get forecast endpoint from points API
    const pointsRes = await axios.get(NWS_POINTS_URL, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/geo+json' },
      timeout: 10000,
    });

    const forecastUrl: string = pointsRes.data.properties.forecast;
    const forecastHourlyUrl: string = pointsRes.data.properties.forecastHourly;

    // Step 2: Get 7-day forecast
    const forecastRes = await axios.get(forecastUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    const periods: WeatherData[] = forecastRes.data.properties.periods;
    const today = periods[0];
    const tonight = periods[1];
    const week = periods.slice(0, 7);

    // Build a descriptive summary for article generation
    const summary = `
KENDALLVILLE, IN WEATHER REPORT — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

TODAY: ${today.name}
Temperature: ${today.temperature}°${today.temperatureUnit}
Wind: ${today.windSpeed} ${today.windDirection}
Conditions: ${today.shortForecast}
Details: ${today.detailedForecast}

TONIGHT: ${tonight.name}
Temperature: ${tonight.temperature}°${tonight.temperatureUnit}
Conditions: ${tonight.shortForecast}
Details: ${tonight.detailedForecast}

7-DAY OUTLOOK FOR NOBLE COUNTY, INDIANA:
${week.map((p) => `• ${p.name}: ${p.shortForecast}, High/Low ${p.temperature}°${p.temperatureUnit}`).join('\n')}

Source: National Weather Service, Northern Indiana (IWX)
    `.trim();

    return [
      {
        source: 'National Weather Service',
        sourceUrl: 'https://www.weather.gov/iwx/',
        title: `Kendallville Weather: ${today.shortForecast}, ${today.temperature}°${today.temperatureUnit}`,
        rawContent: summary,
        category: 'Weather',
        publishedAt: new Date().toISOString(),
      },
    ];
  } catch (err) {
    logger.error('Weather scraper failed', err);
    return [];
  }
}

export async function getCurrentWeather(): Promise<WeatherData | null> {
  try {
    const pointsRes = await axios.get(NWS_POINTS_URL, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const forecastUrl = pointsRes.data.properties.forecast;
    const forecastRes = await axios.get(forecastUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    return forecastRes.data.properties.periods[0] as WeatherData;
  } catch {
    return null;
  }
}
