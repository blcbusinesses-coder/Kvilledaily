import { getCurrentWeather } from '@/lib/scrapers/weather';

export async function WeatherWidget() {
  let weather = null;
  try {
    weather = await getCurrentWeather();
  } catch {
    // Non-fatal
  }

  if (!weather) {
    return (
      <div className="bg-sky-50 border border-sky-100 p-4 rounded">
        <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-sky-700 mb-2">
          Weather
        </h3>
        <p className="text-sm text-gray-500">Kendallville, IN</p>
        <p className="text-xs text-gray-400 mt-1">Weather data unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-sky-50 border border-sky-100 p-4 rounded">
      <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-sky-700 mb-2">
        Current Weather
      </h3>
      <p className="text-sm font-bold text-gray-600">Kendallville, IN</p>
      <div className="flex items-center gap-3 my-2">
        {weather.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={weather.icon}
            alt={weather.shortForecast}
            width={48}
            height={48}
          />
        )}
        <div>
          <p className="text-3xl font-bold text-sky-700">
            {weather.temperature}°{weather.temperatureUnit ?? 'F'}
          </p>
          <p className="text-sm text-gray-600">{weather.shortForecast}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Wind: {weather.windSpeed} {weather.windDirection}
      </p>
      <a
        href="https://www.weather.gov/iwx/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-sky-600 hover:underline mt-1 inline-block"
      >
        Full forecast →
      </a>
    </div>
  );
}
