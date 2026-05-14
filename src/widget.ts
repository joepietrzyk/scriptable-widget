import { weeklySchedule } from "./schedule";
import { getGearAdvice } from "./gearAdvice";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NoonWeather {
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  weatherCode: number;
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

// ── Weather fetch ─────────────────────────────────────────────────────────────

async function fetchNoonWeather(
  latitude: number,
  longitude: number,
): Promise<NoonWeather> {
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
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const noonStr =
    `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T12:00`;

  const noonIdx = data.hourly.time.indexOf(noonStr);
  if (noonIdx === -1) {
    throw new Error(`Noon (${noonStr}) not found in forecast times`);
  }

  return {
    temperature: data.hourly.temperature_2m[noonIdx]!,
    apparentTemperature: data.hourly.apparent_temperature[noonIdx]!,
    precipitationProbability: data.hourly.precipitation_probability[noonIdx]!,
    weatherCode: data.hourly.weathercode[noonIdx]!,
    windspeed: data.hourly.windspeed_10m[noonIdx]!,
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()]!;
  const today = weeklySchedule[dayName]!;

  let weather = null;
  if (today.isOutdoor) {
    Location.setAccuracyToKilometer();
    const { latitude, longitude } = await Location.current();
    weather = await fetchNoonWeather(latitude, longitude);
  }
  const advice = weather ? getGearAdvice(weather) : null;

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const header = widget.addText(today.workoutType);
  header.font = Font.boldSystemFont(14);
  header.textColor = new Color(today.isOutdoor ? "#7ec8e3" : "#a0a0c0");

  widget.addSpacer(4);

  if (weather) {
    const tempLine = widget.addText(
      `${Math.round(weather.temperature)}°C  feels ${Math.round(weather.apparentTemperature)}°C`,
    );
    tempLine.font = Font.systemFont(11);
    tempLine.textColor = new Color("#e0e0e0");
  }

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
