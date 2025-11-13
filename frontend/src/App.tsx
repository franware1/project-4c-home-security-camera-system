import { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

function App() {
  // Backend base URL (proxy to ESP32)
  const backend = "http://localhost:8080";

  // Controls
  const [res, setRes] = useState<string>("VGA");
  const [flash, setFlash] = useState<number>(0);

  // Stream state
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamVersion, setStreamVersion] = useState<number>(0); // used to "kick" the stream

  // Build stream URL with cache-busting (via version)
  const streamUrl = useMemo(() => {
    if (!isStreaming) return "";
    // each time streamVersion changes, URL changes -> browser reconnects
    return `${backend}/api/stream?v=${streamVersion}`;
  }, [backend, isStreaming, streamVersion]);

  // Start/stop helpers
  const startStream = useCallback(() => {
    setIsStreaming(true);
    setStreamVersion((v) => v + 1); // force a fresh connection
  }, []);

  const stopStream = useCallback(() => {
    setIsStreaming(false); // src becomes "" via streamUrl
  }, []);

  // Reconnect if stream errors out (basic retry)
  const onStreamError = useCallback(() => {
    if (!isStreaming) return;
    // small delay, then bump version so URL changes
    setTimeout(() => {
      setStreamVersion((v) => v + 1);
    }, 800);
  }, [isStreaming]);

  // Actions
  const snap = useCallback(async () => {
    const r = await fetch(`${backend}/api/capture`);
    const b = await r.blob();
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapshot_${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [backend]);

  const changeRes = useCallback(
    async (size: string) => {
      setRes(size);
      await fetch(`${backend}/api/setres?size=${encodeURIComponent(size)}`);
      // Nudge the stream to refresh if it's running
      if (isStreaming) {
        setStreamVersion((v) => v + 1);
      }
    },
    [backend, isStreaming]
  );

  const changeFlash = useCallback(
    async (value: number) => {
      setFlash(value);
      await fetch(`${backend}/api/flash?pwm=${value}`).catch(() => {});
    },
    [backend]
  );

  // Timelapse recorder (client-side)
  const [recording, setRecording] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(2000);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      snap();
    }, intervalMs);
    return () => clearInterval(id);
  }, [recording, intervalMs, snap]);

  return (
    <div className="page">
      {/* Left: Stream */}
      <div className="panel stream">
        <div className="stream-header">
          <h3>Live Stream</h3>
        </div>

        <div className="stream-box">
          <img
            id="cam"
            src={streamUrl}
            alt="ESP32-CAM"
            onError={onStreamError}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="panel controls">
        <h3>Controls</h3>

        <label className="row">
          <span>Resolution</span>
          <select value={res} onChange={(e) => changeRes(e.target.value)}>
            <option>QVGA</option>
            <option>VGA</option>
            <option>SVGA</option>
            <option>XGA</option>
            <option>SXGA</option>
            <option>UXGA</option>
          </select>
        </label>

        <label className="row">
          <span>Flash</span>
          <input
            type="range"
            min={0}
            max={255}
            value={flash}
            onChange={(e) => changeFlash(Number(e.target.value))}
          />
          <span className="mono">{flash}</span>
        </label>

        <div className="row buttons">
          {isStreaming ? (
            <button className="secondary" onClick={stopStream}>
              Stop
            </button>
          ) : (
            <button onClick={startStream}>Start</button>
          )}
          <button onClick={snap}>Snapshot</button>
        </div>

        <div className="divider" />

        <h4>Timelapse (client-side)</h4>
        <label className="row">
          <span>Interval (ms)</span>
          <input
            type="number"
            min={500}
            step={100}
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
          />
        </label>
        <div className="row buttons">
          {!recording ? (
            <button onClick={() => setRecording(true)}>Start Recording</button>
          ) : (
            <button className="danger" onClick={() => setRecording(false)}>
              Stop Recording
            </button>
          )}
        </div>
      </div>

      {/* Bottom-right action bar */}
      <div className="actionbar">
        <button onClick={snap}>Snapshot</button>
        {isStreaming ? (
          <button className="secondary" onClick={stopStream}>
            Stop
          </button>
        ) : (
          <button onClick={startStream}>Start</button>
        )}
        {!recording ? (
          <button onClick={() => setRecording(true)}>Record</button>
        ) : (
          <button className="danger" onClick={() => setRecording(false)}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
