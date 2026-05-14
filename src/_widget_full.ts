import "./polyfills";
import { fetchWeatherApi } from "openmeteo";
import type { VariablesWithTime } from "@openmeteo/sdk/variables-with-time";
import type { VariableWithValues } from "@openmeteo/sdk/variable-with-values";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVar(hourly: VariablesWithTime, index: number): VariableWithValues {
  const v = hourly.variables(index);
  if (!v) throw new Error(`No variable at index ${index}`);
  return v;
}

function readValue(v: VariableWithValues, timeIdx: number): number {
  const arr = v.valuesArray();
  if (!arr) throw new Error("Variable has no values array");
  const val = arr[timeIdx];
  if (val === undefined) throw new Error(`No value at time index ${timeIdx}`);
  return val;
}

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

  // Wind chill on cooler days warrants a shell
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

// ─────────────────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      Timer.schedule(ms, false, () => reject(new Error(`${label} timed out after ${ms}ms`))),
    ),
  ]);
}

async function toast(title: string, message: string): Promise<void> {
  if (config.runsInWidget) return;
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("OK");
  await a.presentAlert();
}

async function main() {
  await toast("Step 1", "Fetching location…");
  const { latitude, longitude } = await withTimeout(
    Location.current(),
    10_000,
    "Location.current()",
  );

  await toast("Step 2", `Got location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\nFetching weather…`);

  // Variables are returned by the API in the same order as requested here.
  const responses = await withTimeout(
    fetchWeatherApi(
      "https://api.open-meteo.com/v1/forecast",
      {
        latitude,
        longitude,
        hourly: [
          "temperature_2m",             // index 0
          "apparent_temperature",        // index 1
          "precipitation_probability",   // index 2
          "weathercode",                 // index 3
          "windspeed_10m",               // index 4
        ],
        timezone: "auto",
        forecast_days: 1,
      },
    ),
    10_000,
    "fetchWeatherApi()",
  );

  const apiResponse = responses[0];
  if (!apiResponse) throw new Error("No response from weather API");

  const hourly = apiResponse.hourly();
  if (!hourly) throw new Error("No hourly data in weather response");

  // hourly.time() is UTC Unix seconds (bigint) for the start of the time series.
  // today.setHours(12) sets noon in the device's local timezone; getTime() is UTC ms.
  // With timezone=auto, the API aligns the time series to local midnight, so the
  // UTC timestamps for both are comparable directly.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const noonUtcSecs = BigInt(Math.floor(today.getTime() / 1000));
  const startSecs = hourly.time();
  const intervalSecs = BigInt(hourly.interval());
  const noonIdx = Number((noonUtcSecs - startSecs) / intervalSecs);

  const timeSteps = Number((hourly.timeEnd() - startSecs) / intervalSecs);
  if (noonIdx < 0 || noonIdx >= timeSteps) {
    throw new Error(
      `Noon index ${noonIdx} is outside the ${timeSteps}-step forecast`,
    );
  }

  const noonWeather: NoonWeather = {
    temperature: readValue(getVar(hourly, 0), noonIdx),
    apparentTemperature: readValue(getVar(hourly, 1), noonIdx),
    precipitationProbability: readValue(getVar(hourly, 2), noonIdx),
    weatherCode: readValue(getVar(hourly, 3), noonIdx),
    windspeed: readValue(getVar(hourly, 4), noonIdx),
    timezone: apiResponse.timezone() ?? "",
    utcOffsetSeconds: apiResponse.utcOffsetSeconds(),
  };

  const runDay = isRunDay();
  const advice = getRunAdvice(noonWeather);

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const header = widget.addText(runDay ? "Noon Run" : "Rest Day");
  header.font = Font.boldSystemFont(14);
  header.textColor = new Color(runDay ? "#7ec8e3" : "#a0a0c0");

  widget.addSpacer(4);

  const tempLine = widget.addText(
    `${Math.round(noonWeather.temperature)}°C  feels ${Math.round(noonWeather.apparentTemperature)}°C`,
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
    const alert = new Alert();
    alert.title = runDay ? "Noon Run" : "Rest Day";
    let body = `${Math.round(noonWeather.temperature)}°C  feels ${Math.round(noonWeather.apparentTemperature)}°C`;
    if (runDay) {
      body += "\n\n" + advice.layers.map(l => `• ${l}`).join("\n");
      if (advice.note) body += `\n\n${advice.note}`;
    }
    alert.message = body;
    alert.addAction("OK");
    await alert.presentAlert();
    await widget.presentSmall();
  }
}

module.exports = { main };
