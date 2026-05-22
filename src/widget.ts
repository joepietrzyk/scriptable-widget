import { weeklySchedule } from "./schedule";
import { getGearAdvice } from "./gearAdvice";
import { fetchWeather, celsiusToFahrenheit } from "./weather";
import { theme } from "./theme";

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = DAY_NAMES[now.getDay()]!;
  const today = weeklySchedule[dayName.toLowerCase()]!;
  const currentHour = now.getHours();
  const isBeforeWorkout = currentHour < 13;

  Location.setAccuracyToKilometer();
  const { latitude, longitude } = await Location.current();

  const showWorkout = today.isOutdoor && isBeforeWorkout;
  const WORKOUT_HOUR = 12;

  const [currentWeather, workoutWeatherFetched] = await Promise.all([
    fetchWeather(latitude, longitude, currentHour),
    showWorkout && currentHour !== WORKOUT_HOUR
      ? fetchWeather(latitude, longitude, WORKOUT_HOUR)
      : Promise.resolve(null),
  ]);

  const currentTempF = Math.round(
    celsiusToFahrenheit(currentWeather.temperature),
  );
  const currentApparentF = Math.round(
    celsiusToFahrenheit(currentWeather.apparentTemperature),
  );

  const workoutWeather = showWorkout
    ? currentHour === WORKOUT_HOUR
      ? currentWeather
      : workoutWeatherFetched
    : null;
  const workoutTempF = workoutWeather
    ? Math.round(celsiusToFahrenheit(workoutWeather.temperature))
    : 0;
  const workoutApparentF = workoutWeather
    ? Math.round(celsiusToFahrenheit(workoutWeather.apparentTemperature))
    : 0;
  const advice = workoutWeather
    ? getGearAdvice({
        apparentTemperature: workoutApparentF,
        precipitationProbability: workoutWeather.precipitationProbability,
        windspeed: workoutWeather.windspeed,
      })
    : null;

  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [
    new Color(theme.gradient.top),
    new Color(theme.gradient.bottom),
  ];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.setPadding(14, 16, 14, 16);

  // Date line: "Friday, May 22"
  const dateText = widget.addText(
    `${dayName}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`,
  );
  dateText.font = Font.systemFont(theme.date.fontSize);
  dateText.textColor = new Color(theme.date.color);

  widget.addSpacer(4);

  // Workout type header
  const header = widget.addText(today.workoutType);
  header.font = Font.boldSystemFont(theme.header.fontSize);
  header.textColor = new Color(
    today.isOutdoor ? theme.header.outdoorColor : theme.header.indoorColor,
  );

  widget.addSpacer(4);

  // Current conditions
  const nowLine = widget.addText(
    `Now: ${currentTempF}°F  feels ${currentApparentF}°F`,
  );
  nowLine.font = Font.systemFont(theme.temperature.fontSize);
  nowLine.textColor = new Color(theme.temperature.color);

  // Workout conditions + gear advice (outdoor days before 1 PM only)
  if (showWorkout && advice) {
    widget.addSpacer(6);

    const workoutLine = widget.addText(
      `Workout: ${workoutTempF}°F  feels ${workoutApparentF}°F`,
    );
    workoutLine.font = Font.systemFont(theme.temperature.fontSize);
    workoutLine.textColor = new Color(theme.temperature.color);

    widget.addSpacer(2);
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
    await widget.presentLarge();
  }
}

module.exports = { main };
