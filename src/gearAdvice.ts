export interface GearAdvice {
  layers: string[];
  note?: string;
}

interface WeatherConditions {
  apparentTemperature: number;
  precipitationProbability: number;
  windspeed: number;
}

// Thresholds are for high-intensity exercise; body generates ~8–10°C of extra heat.
export function getGearAdvice(w: WeatherConditions): GearAdvice {
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
