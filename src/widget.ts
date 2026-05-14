import { weeklySchedule } from "./schedule";
import { getGearAdvice } from "./gearAdvice";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Parsed weather data for a single forecast hour.
 * Values are in raw API units: temperatures in **°C**, wind in km/h.
 * Convert to °F with {@link celsiusToFahrenheit} before displaying or passing to gear advice.
 */
interface Weather {
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

/** Raw hourly arrays from the Open-Meteo forecast API. */
interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  weathercode: number[];
  windspeed_10m: number[];
}

/** Top-level shape of an Open-Meteo forecast response. */
interface OpenMeteoResponse {
  timezone: string;
  utc_offset_seconds: number;
  hourly: OpenMeteoHourly;
}

/** Converts a Celsius value to Fahrenheit. */
const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;

// ── Weather fetch ─────────────────────────────────────────────────────────────

/**
 * Fetches the Open-Meteo hourly forecast and returns data for the given hour.
 * Returned temperatures are in **°C** — call {@link celsiusToFahrenheit} before use.
 *
 * @param latitude - Decimal latitude of the location.
 * @param longitude - Decimal longitude of the location.
 * @param hour - Local hour (0–23) to look up in the forecast.
 */
async function fetchWeather(
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

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Entry point — builds and presents the Scriptable widget.
 * Fetches location + weather, converts temperatures to °F for display and gear advice,
 * then renders today's workout type, temperature, and (for outdoor days) clothing layers.
 */
async function main() {
  const dayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date().getDay()]!;
  const today = weeklySchedule[dayName]!;

  Location.setAccuracyToKilometer();
  const { latitude, longitude } = await Location.current();
  const hour = today.isOutdoor ? 12 : new Date().getHours();
  const weather = await fetchWeather(latitude, longitude, hour);
  const temperatureF = Math.round(celsiusToFahrenheit(weather.temperature));
  const apparentTemperatureF = Math.round(
    celsiusToFahrenheit(weather.apparentTemperature),
  );
  const advice = today.isOutdoor
    ? getGearAdvice({
        apparentTemperature: apparentTemperatureF,
        precipitationProbability: weather.precipitationProbability,
        windspeed: weather.windspeed,
      })
    : null;

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const header = widget.addText(today.workoutType);
  header.font = Font.boldSystemFont(14);
  header.textColor = new Color(today.isOutdoor ? "#7ec8e3" : "#a0a0c0");

  widget.addSpacer(4);

  const tempLine = widget.addText(
    `${temperatureF}°F  feels ${apparentTemperatureF}°F`,
  );
  tempLine.font = Font.systemFont(11);
  tempLine.textColor = new Color("#e0e0e");

  if (today.isOutdoor && advice) {
    widget.addSpacer(4);
    for (const layer of advice.layers) {
      const t = widget.addText(`• ${layer}`);
      t.font = Font.systemFont(10);
      t.textColor = new Color("#c8e6c9");
    }
    if (advice.note) {
      widget.addSpacer(2);
      const noteText = widget.addText(advice.note);
      noteText.font = Font.italicSystemFont(10);
      noteText.textColor = new Color("#ffcc80");
    }
  }

  widget.addSpacer();
  Script.setWidget(widget);

  if (config.runsInWidget) {
    Script.complete();
  } else {
    await widget.presentSmall();
  }
}

module.exports = { main };
