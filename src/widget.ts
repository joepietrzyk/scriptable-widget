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

// ─────────────────────────────────────────────────────────────────────────────

await (async () => {
  const { latitude, longitude } = await Location.current();

  // Variables are returned by the API in the same order as requested here.
  const responses = await fetchWeatherApi(
    "https://api.open-meteo.com/v1/forecast",
    {
      latitude,
      longitude,
      hourly: [
        "temperature_2m",        // index 0
        "apparent_temperature",  // index 1
        "precipitation_probability", // index 2
        "weathercode",           // index 3
        "windspeed_10m",         // index 4
      ],
      timezone: "auto",
      forecast_days: 1,
    },
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

  void noonWeather; // reserved for display use

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const title = widget.addText("Hello, Scriptable!");
  title.font = Font.boldSystemFont(16);
  title.textColor = new Color("#e0e0e0");

  widget.addSpacer();

  const subtitle = widget.addText("Built with TypeScript + Bun");
  subtitle.font = Font.systemFont(12);
  subtitle.textColor = new Color("#a0a0c0");

  Script.setWidget(widget);

  if (config.runsInWidget) {
    Script.complete();
  } else {
    await widget.presentSmall();
  }
})();
