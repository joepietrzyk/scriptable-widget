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

interface RunAdvice {
  layers: string[];
  note?: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRunDay(): boolean {
  // Mon=1, Wed=3, Fri=5, Sat=6
  const day = new Date().getDay();
  return day === 1 || day === 3 || day === 5 || day === 6;
}

// Thresholds are for high-intensity running; body generates ~8–10°C of extra heat.
function getRunAdvice(w: NoonWeather): RunAdvice {
  const apparent = w.apparentTemperature;
  const rain = w.precipitationProbability;
  const wind = w.windspeed;

  const layers: string[] = [];
  let note: string | undefined;

  if (apparent < -10) {
    layers.push("Thermal base + insulated jacket");
    layers.push("Thermal tights");
    layers.push("Gloves + balaclava");
  } else if (apparent < 0) {
    layers.push("Base layer + fleece jacket");
    layers.push("Running tights");
    layers.push("Gloves + light hat");
  } else if (apparent < 5) {
    layers.push("Long sleeve + light jacket");
    layers.push("Tights + gloves");
  } else if (apparent < 10) {
    layers.push("Long sleeve shirt");
    layers.push("Light jacket + tights");
  } else if (apparent < 15) {
    layers.push("Long sleeve shirt");
    layers.push("Shorts or tights");
  } else if (apparent < 20) {
    layers.push("Short sleeve shirt");
    layers.push("Shorts");
  } else if (apparent < 27) {
    layers.push("Light t-shirt + shorts");
  } else {
    layers.push("Singlet + shorts");
    note = "Extreme heat — hydrate!";
  }

  if (wind >= 30 && apparent < 15) {
    layers.unshift("Wind-resistant shell");
  }

  if (rain >= 50) {
    layers.push("Rain jacket");
  } else if (rain >= 30) {
    note = note ?? `${Math.round(rain)}% rain chance`;
  }

  return note !== undefined ? { layers, note } : { layers };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  Location.setAccuracyToKilometer();
  const { latitude, longitude } = await Location.current();

  const weather = await fetchNoonWeather(latitude, longitude);
  const runDay = isRunDay();
  const advice = getRunAdvice(weather);

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const header = widget.addText(runDay ? "Noon Run" : "Rest Day");
  header.font = Font.boldSystemFont(14);
  header.textColor = new Color(runDay ? "#7ec8e3" : "#a0a0c0");

  widget.addSpacer(4);

  const tempLine = widget.addText(
    `${Math.round(weather.temperature)}°C  feels ${Math.round(weather.apparentTemperature)}°C`,
  );
  tempLine.font = Font.systemFont(11);
  tempLine.textColor = new Color("#e0e0e0");

  if (runDay) {
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
