import React from "react";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import type { WeatherData } from "./Weather";

const API_KEY = "0fdd2b72504fbc8706040b30ab60441e";

interface OneCallDaily {
  temp: {
    day: number;
    min: number;
    max: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
}

interface OneCallData {
  daily?: OneCallDaily[];
  // we don't list other fields, but they can exist
}

export function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tomorrow, setTomorrow] = useState<OneCallDaily | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) Fetch CURRENT weather once
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

  // 2) When we HAVE current weather, fetch One Call 3.0 for forecast
  useEffect(() => {
    if (!weather) return; // don't run until we have coords

    async function fetchForecast() {
      try {
        const { lat, lon } = weather.coord;

        const res2 = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        if (!res2.ok) {
          throw new Error(`One Call failed: ${res2.status}`);
        }

        const forecast: OneCallData = await res2.json();
        console.log("One Call forecast:", forecast);

        if (!forecast.daily || forecast.daily.length < 2) {
          console.error("No daily forecast array in One Call response:", forecast);
          setTomorrow(null);
          setError("Tomorrow forecast not available.");
          return;
        }

        setTomorrow(forecast.daily[1]);
      } catch (err) {
        console.error("One Call forecast error:", err);
        setTomorrow(null);
        setError("Tomorrow forecast not available.");
      }
    }

    fetchForecast();
  }, [weather]);

  // Force day icons
  const todayIcon =
    weather?.weather[0]?.icon?.replace("n", "d") ?? undefined;

  const tomorrowIcon =
    tomorrow?.weather?.[0]?.icon?.replace("n", "d") ?? undefined;

  return (
    <div className="panel weather">
      <h2>Weather</h2>

      <div className="weather-card">
        {error && (
          <p className="weather-error" style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            {error}
          </p>
        )}

        {/* TODAY */}
        {weather && (
          <div className="weather-main-row">
            {todayIcon && (
              <img
                className="weather-icon"
                src={`https://openweathermap.org/img/wn/${todayIcon}@2x.png`}
                alt="Today's weather"
              />
            )}
            <div>
              <div className="weather-city">{weather.name}</div>
              <div className="weather-condition">
                {weather.weather[0].description}
              </div>
            </div>
            <div className="weather-temp">
              {Math.round(weather.main.temp)}°C
            </div>
          </div>
        )}

        {/* TOMORROW */}
        {tomorrow && (
          <div className="tomorrow-section" style={{ marginTop: "12px" }}>
            <h3 style={{ fontSize: "0.9rem", marginBottom: "6px" }}>Tomorrow</h3>
            <div className="weather-main-row">
              {tomorrowIcon && (
                <img
                  className="weather-icon"
                  src={`https://openweathermap.org/img/wn/${tomorrowIcon}@2x.png`}
                  alt="Tomorrow's weather"
                />
              )}
              <div>
                <div className="weather-condition">
                  {tomorrow.weather[0].description}
                </div>
                <div>
                  Min {Math.round(tomorrow.temp.min)}°C — Max{" "}
                  {Math.round(tomorrow.temp.max)}°C
                </div>
              </div>
              <div className="weather-temp">
                {Math.round(tomorrow.temp.day)}°C
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
