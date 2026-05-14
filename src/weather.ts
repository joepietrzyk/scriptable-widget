export interface Weather {
  /** Actual temperature in °C (as returned by the API). */
  temperature: number;
  /** Feels-like temperature in °C (as returned by the API). */
  apparentTemperature: number;
  /** Precipitation probability as a percentage (0–100). */
  precipitationProbability: number;
  /** WMO weather interpretation code. */
  weatherCode: number;
  /** Wind speed in km/h. */
  windspeed: number;
  timezone: string;
  utcOffsetSeconds: number;
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  weathercode: number[];
  windspeed_10m: number[];
}

interface OpenMeteoResponse {
  timezone: string;
  utc_offset_seconds: number;
  hourly: OpenMeteoHourly;
}

/** Converts a Celsius value to Fahrenheit. */
export const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;

/**
 * Fetches the Open-Meteo hourly forecast and returns data for the given hour.
 * Returned temperatures are in **°C** — call {@link celsiusToFahrenheit} before use.
 *
 * @param latitude - Decimal latitude of the location.
 * @param longitude - Decimal longitude of the location.
 * @param hour - Local hour (0–23) to look up in the forecast.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  hour: number,
): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m` +
    `&timezone=auto` +
    `&forecast_days=1`;

  const req = new Request(url);
  req.timeoutInterval = 10;
  const data = (await req.loadJSON()) as OpenMeteoResponse;

  // API returns local times as "YYYY-MM-DDTHH:MM" when timezone=auto
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const targetStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(hour)}:00`;

  const idx = data.hourly.time.indexOf(targetStr);
  if (idx === -1) {
    throw new Error(`Hour (${targetStr}) not found in forecast times`);
  }

  return {
    temperature: data.hourly.temperature_2m[idx]!,
    apparentTemperature: data.hourly.apparent_temperature[idx]!,
    precipitationProbability: data.hourly.precipitation_probability[idx]!,
    weatherCode: data.hourly.weathercode[idx]!,
    windspeed: data.hourly.windspeed_10m[idx]!,
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
  };
}
