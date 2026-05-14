/** Clothing recommendation for an outdoor workout. */
export interface GearAdvice {
  /** Ordered list of clothing items to wear, from most to least important. */
  layers: string[];
  /** Optional advisory note (e.g. heat warning, rain chance). */
  note?: string;
}

/**
 * Weather inputs for gear recommendations.
 * All temperatures must be in **°F** — see {@link getGearAdvice}.
 */
interface WeatherConditions {
  /** Feels-like (apparent) temperature in °F. */
  apparentTemperature: number;
  /** Precipitation probability as a percentage (0–100). */
  precipitationProbability: number;
  /** Wind speed in km/h. */
  windspeed: number;
}

/**
 * Returns clothing layer recommendations for an outdoor workout.
 *
 * All temperature thresholds are in **°F** and are tuned for high-intensity exercise
 * (running, cycling), where the body generates roughly 15–18°F of extra perceived heat
 * compared to standing still. Adjust the `apparent < N` cutoffs below to match your
 * personal comfort — they're intentionally subjective.
 *
 * @param w - Current weather conditions. Temperatures must be in °F.
 * @returns Layering advice and an optional note.
 */
export function getGearAdvice(w: WeatherConditions): GearAdvice {
  const apparent = w.apparentTemperature;
  const rain = w.precipitationProbability;
  const wind = w.windspeed;

  const layers: string[] = [];
  let note: string | undefined;

  if (apparent < 14) {
    layers.push("Thermal base + insulated jacket");
    layers.push("Thermal tights");
    layers.push("Gloves + balaclava");
  } else if (apparent < 32) {
    layers.push("Base layer + fleece jacket");
    layers.push("Running tights");
    layers.push("Gloves + light hat");
  } else if (apparent < 41) {
    layers.push("Long sleeve + light jacket");
    layers.push("Tights + gloves");
  } else if (apparent < 50) {
    layers.push("Long sleeve shirt");
    layers.push("Light jacket + tights");
  } else if (apparent < 59) {
    layers.push("Long sleeve shirt");
    layers.push("Shorts or tights");
  } else if (apparent < 68) {
    layers.push("Short sleeve shirt");
    layers.push("Shorts");
  } else if (apparent < 81) {
    layers.push("Light t-shirt + shorts");
  } else {
    layers.push("Singlet + shorts");
    note = "Extreme heat — hydrate!";
  }

  if (wind >= 30 && apparent < 59) {
    layers.unshift("Wind-resistant shell");
  }

  if (rain >= 50) {
    layers.push("Rain jacket");
  } else if (rain >= 30) {
    note = note ?? `${Math.round(rain)}% rain chance`;
  }

  return note !== undefined ? { layers, note } : { layers };
}
