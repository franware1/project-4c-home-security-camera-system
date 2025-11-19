import { useEffect, useState } from "react";
import type { WeatherData } from "./components/Weather";

const API_KEY = "0fdd2b72504fbc8706040b30ab60441e";

interface ForecastEntry {
  dt_txt: string; // "2025-11-19 12:00:00"
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
}

interface ForecastData {
  list: ForecastEntry[];
}

interface TomorrowSummary {
  tempDay: number;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
}

export function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tomorrow, setTomorrow] = useState<TomorrowSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) Current weather (same as before)
  useEffect(() => {
    async function fetchCurrent() {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Boston&units=metric&appid=${API_KEY}`
        );
        if (!res.ok) {
          throw new Error(`Current weather failed: ${res.status}`);
        }
        const current: WeatherData = await res.json();
        console.log("Current weather:", current);
        setWeather(current);
      } catch (err) {
        console.error("Current weather error:", err);
        setError("Could not load current weather.");
      }
    }

    fetchCurrent();
  }, []);

  // 2) 5-day / 3-hour forecast, to get TOMORROW (free /forecast endpoint)
  useEffect(() => {
    async function fetchForecast() {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=Boston&units=metric&appid=${API_KEY}`
        );
        if (!res.ok) {
          throw new Error(`Forecast failed: ${res.status}`);
        }

        const forecast: ForecastData = await res.json();
        console.log("Forecast data:", forecast);

        if (!forecast.list || forecast.list.length === 0) {
          console.error("No forecast list found in /forecast response");
          setTomorrow(null);
          return;
        }

        // Compute tomorrow's date string in local time: "YYYY-MM-DD"
        const now = new Date();
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(now.getDate() + 1);

        const yyyy = tomorrowDate.getFullYear();
        const mm = String(tomorrowDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrowDate.getDate()).padStart(2, "0");
        const tomorrowStr = `${yyyy}-${mm}-${dd}`;

        // All forecast entries for that date
        const tomorrowEntries = forecast.list.filter((entry) =>
          entry.dt_txt.startsWith(tomorrowStr)
        );

        if (tomorrowEntries.length === 0) {
          console.warn("No forecast entries for tomorrow:", tomorrowStr);
          setTomorrow(null);
          return;
        }

        const tempsMin = tomorrowEntries.map((e) => e.main.temp_min);
        const tempsMax = tomorrowEntries.map((e) => e.main.temp_max);

        const tempMin = Math.min(...tempsMin);
        const tempMax = Math.max(...tempsMax);

        // Pick a "day" representative: ideally the 12:00 entry, or middle one
        const middayEntry =
          tomorrowEntries.find((e) => e.dt_txt.includes("12:00:00")) ??
          tomorrowEntries[Math.floor(tomorrowEntries.length / 2)];

        const summary: TomorrowSummary = {
          tempDay: middayEntry.main.temp,
          tempMin,
          tempMax,
          description: middayEntry.weather[0].description,
          icon: middayEntry.weather[0].icon,
        };

        setTomorrow(summary);
      } catch (err) {
        console.error("Forecast error:", err);
        // don't overwrite current weather error if that exists
      }
    }

    fetchForecast();
  }, []);

  // Force day icons
  const todayIcon =
    weather?.weather[0]?.icon?.replace("n", "d") ?? undefined;

  const tomorrowIcon =
    tomorrow?.icon?.replace("n", "d") ?? undefined;

  return (
    <div className="panel weather">
      <h2>Weather - {weather?.name}</h2>

      <div className="weather-card">
        {error && (
          <p className="weather-error">
            {error}
          </p>
        )}

        {/* TODAY */}
        {weather && (
          <div className="weather-day">
            <div className="day-icon">
              <h3>Today</h3>
              {todayIcon && (
                <img
                  className="weather-icon"
                  src={`https://openweathermap.org/img/wn/${todayIcon}@2x.png`}
                  alt="Today's weather"
                />
              )}
            </div>
            <div>
              <p className="weather-condition">
                {weather.weather[0].description}
              </p>
              <p>{Math.round(weather.main.temp)}°C</p>
            </div>
          </div>
        )}

        {/* TOMORROW (only shows if we have data; no "loading") */}
        {tomorrow && (
          <div className="weather-day">
            <div className="day-icon">
              <h3>Tomorrow</h3>
              {tomorrowIcon && (
                <img
                  className="weather-icon"
                  src={`https://openweathermap.org/img/wn/${tomorrowIcon}@2x.png`}
                  alt="Tomorrow's weather"
                />
              )}
            </div>
            <div>
              <p>
                {tomorrow.description}
              </p>
              <p>
                Min {Math.round(tomorrow.tempMin)}°C — Max{" "}
                {Math.round(tomorrow.tempMax)}°C
              </p>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
