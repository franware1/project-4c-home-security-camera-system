import { useCallback, useState } from "react";
import "./index.css";

function App() {
  // Backend address, stored in localStorage
  const backend = "http://localhost:8000";

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

  // Snapshot
  const snap = useCallback(async () => {
    const url = buildUrl("/api/capture");
    if (!url) return alert("Enter backend address first!");

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
      {/* Left: Stream */}
      <div className="panel stream">
        <h3>Live Stream</h3>
        <div className="stream-box">
          {isStreaming && backend ? (
            <img
              id="cam"
              src={streamUrl}
              alt="ESP32 Stream"
              onError={onStreamError}
            />
          ) : (
            <div className="stream-placeholder">
              Enter backend address and press Start.
            </div>
          )}
        </div>
        <button onClick={isStreaming ? stopStream : startStream}>
          {isStreaming ? "Stop Stream" : "Start Stream"}
        </button>
      </div>

      {/* Right: Controls */}
      <div className="panel controls">
        <h3>Controls</h3>

        <label className="row">
          <span>Flash</span>
          <select
            value={flashLevel}
            onChange={(e) => changeFlash(e.target.value as "off" | "low" | "high")}
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
