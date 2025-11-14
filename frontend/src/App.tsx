import { useCallback, useState, useEffect } from "react";
import "./index.css";

import placeholderImg from "./assets/PhotoPlaceholder.jpg";
import locationIcon from "./assets/locationIcon.png";

function App() {
  // Backend address, stored in localStorage
  const backend = "http://localhost:8000";

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

  //Camera info

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
      <div className="stream">
        <div className="stream-box">
          {isStreaming && backend ? (
            <img
              id="cam"
              src={streamUrl}
              alt="ESP32 Stream"
              onError={onStreamError}
            />
          ) : (
            <img
              src={placeholderImg}
              alt="Placeholder"
              className="placeholder-image"
            />
          )}
          <div className="img-options left">
            <button>{cameraName}</button>
            <div className="camera-info">
              <h2>{cameraRoom}</h2>
              <span className="location">
                <img src={locationIcon} className="small-icon" alt="Location" />{" "}
                {cameraAddress}
              </span>
            </div>
          </div>
          <div className="img-options right">
            <button onClick={isStreaming ? stopStream : startStream}>
              {isStreaming ? "Stop Stream" : "Start Stream"}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="panel controls">
        <h3>Controls</h3>

        <label className="row">
          <span>Flash</span>
          <select
            value={flashLevel}
            onChange={(e) =>
              changeFlash(e.target.value as "off" | "low" | "high")
            }
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </label>

        <button onClick={snap}>Snapshot</button>
      </div>
    </div>
  );
}

export default App;
