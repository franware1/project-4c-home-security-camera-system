import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";

function App() {
  // Backend base URL (proxy to ESP32)
  const [backend, setBackend] = useState<string>("http://localhost:8080");

  // Controls
  const [res, setRes] = useState<string>("VGA");
  const [flash, setFlash] = useState<number>(0);

  // Stream state
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(0);

  // Simple FPS counter: count onload events per second
  useEffect(() => {
    let frames = 0;
    const id = setInterval(() => {
      setFps(frames);
      frames = 0;
    }, 1000);
    const handler = () => { frames += 1; };
    const el = imgRef.current;
    el?.addEventListener("load", handler);
    return () => {
      clearInterval(id);
      el?.removeEventListener("load", handler);
    };
  }, []);

  // Build stream URL with cache-busting
  const makeStreamUrl = useCallback(() => {
    return `${backend}/api/stream?ts=${Date.now()}`;
  }, [backend]);

  // Start/stop helpers
  const startStream = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.src = makeStreamUrl();
    }
    setIsStreaming(true);
  }, [makeStreamUrl]);

  const stopStream = useCallback(() => {
    if (imgRef.current) {
      // Clearing src stops the MJPEG connection
      imgRef.current.src = "";
    }
    setIsStreaming(false);
  }, []);

  // Auto-start stream on mount / backend change
  useEffect(() => {
    if (!isStreaming) return;
    startStream();
  }, [backend, isStreaming, startStream]);

  // Reconnect if stream errors out (basic retry)
  const onStreamError = useCallback(() => {
    // Small backoff, then try again if still supposed to be streaming
    setTimeout(() => { if (isStreaming) startStream(); }, 800);
  }, [isStreaming, startStream]);

  // Actions
  const snap = useCallback(async () => {
    const r = await fetch(`${backend}/api/capture`);
    const b = await r.blob();
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url; a.download = `snapshot_${Date.now()}.jpg`; a.click();
    URL.revokeObjectURL(url);
  }, [backend]);

  const changeRes = useCallback(async (size: string) => {
    setRes(size);
    await fetch(`${backend}/api/setres?size=${encodeURIComponent(size)}`);
    // Nudge the stream to refresh
    if (imgRef.current) imgRef.current.src = makeStreamUrl();
  }, [backend, makeStreamUrl]);

  const changeFlash = useCallback(async (value: number) => {
    setFlash(value);
    await fetch(`${backend}/api/flash?pwm=${value}`).catch(()=>{});
  }, [backend]);

  // Optional: simple timelapse recorder (downloads a frame every N sec)
  const [recording, setRecording] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(2000);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => { snap(); }, intervalMs);
    return () => clearInterval(id);
  }, [recording, intervalMs, snap]);

  return (
    <div className="page">
      {/* Left: Stream */}
      <div className="panel stream">
        <div className="stream-header">
          <h3>Live Stream</h3>
          <div className="stats">
            <span>FPS: {fps}</span>
          </div>
        </div>
        <div className="stream-box">
          <img
            id="cam"
            ref={imgRef}
            src="" /* set by startStream() */
            alt="ESP32-CAM"
            onError={onStreamError}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="panel controls">
        <h3>Controls</h3>

        <label className="row">
          <span>Backend URL</span>
          <input
            value={backend}
            onChange={(e) => setBackend(e.target.value)}
            placeholder="http://localhost:8080"
          />
        </label>

        <label className="row">
          <span>Resolution</span>
          <select value={res} onChange={(e) => changeRes(e.target.value)}>
            <option>QVGA</option><option>VGA</option><option>SVGA</option>
            <option>XGA</option><option>SXGA</option><option>UXGA</option>
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
            <button className="secondary" onClick={stopStream}>Stop</button>
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
            <button className="danger" onClick={() => setRecording(false)}>Stop Recording</button>
          )}
        </div>

        <p className="hint">
          Tip: Lower resolution (e.g. <b>QVGA</b>) and higher JPEG quality number
          (more compression) in firmware reduce latency a lot.
        </p>
      </div>

      {/* Bottom-right action bar */}
      <div className="actionbar">
        <button onClick={snap}>Snapshot</button>
        {isStreaming ? (
          <button className="secondary" onClick={stopStream}>Stop</button>
        ) : (
          <button onClick={startStream}>Start</button>
        )}
        {!recording ? (
          <button onClick={() => setRecording(true)}>Record</button>
        ) : (
          <button className="danger" onClick={() => setRecording(false)}>Stop</button>
        )}
      </div>
    </div>
  );
}

export default App;
