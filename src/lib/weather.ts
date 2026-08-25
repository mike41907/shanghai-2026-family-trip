export interface WeatherCurrent {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  windSpeedKmh: number;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  highC: number;
  lowC: number;
  precipitationProbability?: number;
}

export interface WeatherSnapshot {
  fetchedAt: string;
  timezone: string;
  current: WeatherCurrent;
  daily: WeatherDay[];
}

export interface WeatherDescription {
  label: string;
  symbol: string;
}

const WEATHER_CACHE_KEY = "shanghai-2026:weather-cache-v1";
const SHANGHAI_WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=31.2304&longitude=121.4737&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai&forecast_days=16";

interface OpenMeteoPayload {
  timezone?: unknown;
  current?: Record<string, unknown>;
  daily?: Record<string, unknown>;
}

export async function fetchShanghaiWeather(signal?: AbortSignal): Promise<WeatherSnapshot> {
  const response = await fetch(SHANGHAI_WEATHER_URL, { signal });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const payload = await response.json() as OpenMeteoPayload;
  const snapshot = parseWeatherPayload(payload);
  if (!snapshot) throw new Error("Weather response is incomplete");
  return snapshot;
}

export function readCachedWeather(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWeatherSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedWeather(snapshot: WeatherSnapshot): void {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Weather remains an optional enhancement when local storage is unavailable.
  }
}

export function describeWeatherCode(code: number): WeatherDescription {
  if (code === 0) return { label: "晴朗", symbol: "☀️" };
  if (code === 1) return { label: "大致晴朗", symbol: "🌤️" };
  if (code === 2) return { label: "局部多雲", symbol: "⛅" };
  if (code === 3) return { label: "多雲", symbol: "☁️" };
  if (code === 45 || code === 48) return { label: "有霧", symbol: "🌫️" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return { label: "毛毛雨", symbol: "🌦️" };
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67) return { label: "下雨", symbol: "🌧️" };
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return { label: "下雪", symbol: "❄️" };
  if (code === 80 || code === 81 || code === 82) return { label: "陣雨", symbol: "🌦️" };
  if (code === 95 || code === 96 || code === 99) return { label: "雷雨", symbol: "⛈️" };
  return { label: "天氣變化", symbol: "🌤️" };
}

export function formatWeatherTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

function parseWeatherPayload(payload: OpenMeteoPayload): WeatherSnapshot | null {
  const current = payload.current;
  const daily = payload.daily;
  if (!current || !daily) return null;

  const currentTime = stringValue(current.time);
  const temperatureC = numberValue(current.temperature_2m);
  const apparentTemperatureC = numberValue(current.apparent_temperature);
  const currentCode = numberValue(current.weather_code);
  const windSpeedKmh = numberValue(current.wind_speed_10m);
  const dates = stringArray(daily.time);
  const codes = numberArray(daily.weather_code);
  const highs = numberArray(daily.temperature_2m_max);
  const lows = numberArray(daily.temperature_2m_min);
  const precipitation = optionalNumberArray(daily.precipitation_probability_max);
  if (!currentTime || temperatureC === undefined || apparentTemperatureC === undefined || currentCode === undefined || windSpeedKmh === undefined || !dates || !codes || !highs || !lows) return null;

  const dailyItems = dates.map((date, index) => {
    const highC = highs[index];
    const lowC = lows[index];
    const weatherCode = codes[index];
    if (highC === undefined || lowC === undefined || weatherCode === undefined) return null;
    const precipitationProbability = precipitation?.[index];
    return {
      date: date.slice(0, 10),
      weatherCode,
      highC,
      lowC,
      precipitationProbability
    } satisfies WeatherDay;
  }).filter((item): item is WeatherDay => item !== null && item.date.length === 10);

  return {
    fetchedAt: new Date().toISOString(),
    timezone: stringValue(payload.timezone) ?? "Asia/Shanghai",
    current: { time: currentTime, temperatureC, apparentTemperatureC, weatherCode: currentCode, windSpeedKmh },
    daily: dailyItems
  };
}

function isWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WeatherSnapshot>;
  return typeof candidate.fetchedAt === "string" && typeof candidate.timezone === "string" && Boolean(candidate.current) && Array.isArray(candidate.daily);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : undefined;
}

function numberArray(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item)) ? value as number[] : undefined;
}

function optionalNumberArray(value: unknown): number[] | undefined {
  return value === undefined ? undefined : numberArray(value);
}
