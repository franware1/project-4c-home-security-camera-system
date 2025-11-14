import { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

function App() {
  // ESP32 base address (user editable)
  const [espHost, setEspHost] = useState<string>("");

  // Stream state
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Flash state (0, 100, 255)
  const [flashLevel, setFlashLevel] = useState<"off" | "low" | "high">("off");

  // Helper: normalize ESP host into a usable base URL
  const normalizedBase = useMemo(() => {
    let base = espHost.trim();
    if (!base) return "";
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = "http://" + base;
    }
    // strip trailing slashes
    return base.replace(/\/+$/, "");
  }, [espHost]);

  // Stream URL
  const streamUrl = useMemo(() => {
    if (!isStreaming || !normalizedBase) return "";
    return `${normalizedBase}/stream`;
  }, [normalizedBase, isStreaming]);

  // Helper to build URLs
  const buildUrl = useCallback(
    (path: string) => {
      if (!normalizedBase) return "";
      return normalizedBase + path;
    },
    [normalizedBase]
  );

  // Start/stop stream
  const startStream = useCallback(() => {
    if (!normalizedBase) {
      alert("Please enter the ESP32 address first.");
      return;
    }
    setIsStreaming(true);
  }, [normalizedBase]);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
  }, []);

  // Stream error: just log; user can press Start again
  const onStreamError = useCallback(() => {
    console.warn("Stream error (img onError fired)");
    // do not flip isStreaming automatically
  }, []);

  // Snapshot
  const snap = useCallback(async () => {
    const url = buildUrl("/capture");
    if (!url) {
      alert("Please enter the ESP32 address first.");
      return;
    }

    try {
      const response = await fetch(url, {
        // With the ESP32 sending Access-Control-Allow-Origin: *,
        // this will be allowed.
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `snapshot_${Date.now()}.jpg`; // this now works (same-origin blob)
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("snapshot failed:", err);
      alert("Snapshot failed. Check console for details.");
    }
  }, [buildUrl]);

  // Map flash level to PWM
  const levelToPwm = (level: "off" | "low" | "high"): number => {
    if (level === "off") return 0;
    if (level === "low") return 100;
    return 255; // high
  };

  // Flash change
  const changeFlash = useCallback(
    async (level: "off" | "low" | "high") => {
      setFlashLevel(level);
      const pwm = levelToPwm(level);
      const url = buildUrl(`/flash?pwm=${pwm}`);
      if (!url) return;
      try {
        await fetch(url);
      } catch (err) {
        console.error("flash failed:", err);
      }
    },
    [buildUrl]
  );

  // Just to reset flash on mount if you want (optional)
  useEffect(() => {
    // try to set flash off at start if address is already filled
    if (!normalizedBase) return;
    changeFlash("off");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  return (
    <div className="page">
      {/* Left: Stream */}
      <div className="panel stream">
        <div className="stream-header">
          <h3>Live Stream</h3>
        </div>

        <div className="stream-box">
          {normalizedBase ? (
            isStreaming ? (
              <img
                id="cam"
                src={streamUrl}
                alt="ESP32-CAM"
                onError={onStreamError}
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <div className="stream-placeholder">
                Stream stopped. Press Start to begin streaming.
              </div>
            )
          ) : (
            <div className="stream-placeholder">
              Enter ESP32 address on the right to start the stream.
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="panel controls">
        <h3>Controls</h3>

        {/* ESP32 address */}
        <label className="row">
          <span>ESP32 Address</span>
          <input
            type="text"
            placeholder="e.g. 192.168.137.17"
            value={espHost}
            onChange={(e) => setEspHost(e.target.value)}
            className="mono"
          />
        </label>

        {/* Flash dropdown */}
        <label className="row">
          <span>Flash</span>
          <select
            value={flashLevel}
            onChange={(e) =>
              changeFlash(e.target.value as "off" | "low" | "high")
            }
            disabled={!normalizedBase}
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </label>

        <div className="row buttons">
          {isStreaming ? (
            <button
              className="secondary"
              onClick={stopStream}
              disabled={!normalizedBase}
            >
              Stop
            </button>
          ) : (
            <button onClick={startStream} disabled={!normalizedBase}>
              Start
            </button>
          )}
          <button onClick={snap} disabled={!normalizedBase}>
            Snapshot
          </button>
        </div>
      </div>

      {/* Bottom-right action bar */}
      <div className="actionbar">
        <button onClick={snap} disabled={!normalizedBase}>
          Snapshot
        </button>
        {isStreaming ? (
          <button
            className="secondary"
            onClick={stopStream}
            disabled={!normalizedBase}
          >
            Stop
          </button>
        ) : (
          <button onClick={startStream} disabled={!normalizedBase}>
            Start
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
