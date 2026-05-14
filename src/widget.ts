import { weeklySchedule } from "./schedule";
import { getGearAdvice } from "./gearAdvice";
import { fetchWeather, celsiusToFahrenheit } from "./weather";
import { theme } from "./theme";

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
  widget.backgroundColor = new Color(theme.background);

  const header = widget.addText(today.workoutType);
  header.font = Font.boldSystemFont(theme.header.fontSize);
  header.textColor = new Color(today.isOutdoor ? theme.header.outdoorColor : theme.header.indoorColor);

  widget.addSpacer(4);

  const tempLine = widget.addText(
    `${temperatureF}°F  feels ${apparentTemperatureF}°F`,
  );
  tempLine.font = Font.systemFont(theme.temperature.fontSize);
  tempLine.textColor = new Color(theme.temperature.color);

  if (today.isOutdoor && advice) {
    widget.addSpacer(4);
    for (const layer of advice.layers) {
      const t = widget.addText(`• ${layer}`);
      t.font = Font.systemFont(theme.layers.fontSize);
      t.textColor = new Color(theme.layers.color);
    }
    if (advice.note) {
      widget.addSpacer(2);
      const noteText = widget.addText(advice.note);
      noteText.font = Font.italicSystemFont(theme.note.fontSize);
      noteText.textColor = new Color(theme.note.color);
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
