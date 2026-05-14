import { weeklySchedule } from "./schedule";
import { getGearAdvice } from "./gearAdvice";
import { fetchWeather, celsiusToFahrenheit } from "./weather";

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
