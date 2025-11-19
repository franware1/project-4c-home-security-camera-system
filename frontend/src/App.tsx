import { useCallback, useState, useEffect } from "react";
import "./index.css";
import { WeatherPanel } from "./WeatherPanel";

import placeholderImg from "./assets/PhotoPlaceholder.jpg";
import locationIcon from "./assets/locationIcon.png";

function App() {
  // Backend address, stored in localStorage
  const backend = "http://localhost:8888";

  // Camera info
  const [cameraName, setCameraName] = useState<string>("Camera");
  const [cameraRoom, setCameraRoom] = useState<string>("Home View");
  const [cameraAddress, setCameraAddress] = useState<string>("Street Address");

  // Whether streaming is on
  const [isStreaming, setIsStreaming] = useState(false);

  // Flash level
  const [flashLevel, setFlashLevel] = useState<"off" | "low" | "high">("off");

  // Build full URL from backend base + path
  const buildUrl = (path: string) => {
    if (!backend) return "";
    return `${backend}${path}`;
  };

  // Stream URL
  const streamUrl = isStreaming ? buildUrl("/api/stream") : "";

  const startStream = () => setIsStreaming(true);
  const stopStream = () => setIsStreaming(false);
  const onStreamError = () => console.warn("Stream error.");

  // Camera info
  useEffect(() => {
    if (!backend) return;

    const fetchInfo = async () => {
      try {
        const res = await fetch(`${backend}/api/camera-info`);
        if (!res.ok) throw new Error("Failed to fetch camera info");
        const data = await res.json();

        if (data.name) setCameraName(data.name);
        if (data.room) setCameraRoom(data.room);
        if (data.address) setCameraAddress(data.address);
      } catch (err) {
        console.error("camera info error:", err);
      }
    };

    fetchInfo();
  }, []);

  // Snapshot
  const snap = useCallback(async () => {
    const url = buildUrl("/api/capture");
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `snapshot_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(dl);
    } catch (err) {
      console.error(err);
      alert("Snapshot failed.");
    }
  }, []);

  // Flash logic
  const levelToPwm = (level: "off" | "low" | "high") => {
    if (level === "off") return 0;
    if (level === "low") return 100;
    return 255;
  };

  const changeFlash = async (level: "off" | "low" | "high") => {
    setFlashLevel(level);
    const pwm = levelToPwm(level);
    const url = buildUrl(`/api/flash?pwm=${pwm}`);
    if (!url) return alert("Enter backend address first!");

    try {
      await fetch(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      {/* Stream Image */}
      <div className="stream">
        <div className="stream-box">
          {/* Checks if connected to the stream if yes shows it */}
          {isStreaming && backend ? (
            <img
              id="cam"
              src={streamUrl}
              alt="ESP32 Stream"
              onError={onStreamError}
            />
          ) : (
            // Placeholder image when not streaming
            <img
              src={placeholderImg}
              alt="Placeholder"
              className="placeholder-image"
            />
          )}
          {/* Left options on img */}
          <div className="img-options left">
            {/* Bootstrap dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="dropdownMenuButton1"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Dropdown button
              </button>
              <ul
                className="dropdown-menu"
                aria-labelledby="dropdownMenuButton1"
              >
                {/* Li gotta be chanded with a script getting all available cameras */}
                <li>
                  <a className="dropdown-item" href="#">
                    Action
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    Another action
                  </a>
                </li>
              </ul>
            </div>
            {/* Display current camera information */}
            {/* Gotta change when using multiple cameras */}
            <div className="camera-info">
              <h2>{cameraRoom}</h2>
              <span className="location">
                <img src={locationIcon} className="small-icon" alt="Location" />{" "}
                {cameraAddress}
              </span>
            </div>
          </div>
          {/* Simple button to turn on and off streaming */}
          <div className="img-options right">
            <button onClick={isStreaming ? stopStream : startStream}>
              {isStreaming ? "Stop Stream" : "Start Stream"}
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="panel members-activity">
        <div className="members">
          <h2>Members</h2>
          <div className="member-img">
            <img src="https://avatar.iran.liara.run/public" />
            <img src="https://avatar.iran.liara.run/public/3" />
            <img src="https://avatar.iran.liara.run/public/29" />
            <img src="https://avatar.iran.liara.run/public/8" />
          </div>
        </div>
        <hr />
        <div className="activity">
          <h2>Activity</h2>
          <div className="activity-item">
            <img src="https://avatar.iran.liara.run/public" />
            <div>
              <h4>Home</h4>
              <span>0 Activities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cameras */}
      <div className="panel cameras">
        <h2>Cameras</h2>
        <div className="camera-item">
          <img src={placeholderImg} alt="" />
          <div className="camera-info">
            <h4>{cameraName} 1</h4>
            <span>12pm-8pm</span>
          </div>
          <div className="form-check form-switch large-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckDefault"
            />
          </div>
        </div>
        <hr />
        <div className="camera-item">
          <img src={placeholderImg} alt="" />
          <div className="camera-info">
            <h4>{cameraName} 2</h4>
            <span>8pm-12pm</span>
          </div>
          <div className="form-check form-switch large-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckDefault"
            />
          </div>
        </div>
      </div>

      {/* Weather panel */}
      <WeatherPanel />

      {/* Features */}
      <div className="panel features">
        <label className="row">
          <span>Flash</span>
          <div className="dropdown">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              id="flashDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {flashLevel === "off"
                ? "Off"
                : flashLevel === "low"
                ? "Low"
                : "High"}
            </button>

            <ul className="dropdown-menu" aria-labelledby="flashDropdown">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => changeFlash("off")}
                >
                  Off
                </button>
              </li>

              <li>
                <button
                  className="dropdown-item"
                  onClick={() => changeFlash("low")}
                >
                  Low
                </button>
              </li>

              <li>
                <button
                  className="dropdown-item"
                  onClick={() => changeFlash("high")}
                >
                  High
                </button>
              </li>
            </ul>
          </div>
        </label>

        <button onClick={snap}>Snapshot</button>
      </div>
    </div>
  );
}

export default App;
