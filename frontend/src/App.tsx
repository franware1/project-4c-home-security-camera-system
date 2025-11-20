import { useCallback, useState, useEffect } from "react";
import "./index.css";
import { WeatherPanel } from "./WeatherPanel";

import placeholderImg from "./assets/PhotoPlaceholder.jpg";
import locationIcon from "./assets/locationIcon.png";

type Camera = {
  id: string;
  label: string;
  baseUrl: string;
};

function App() {
  // Backend address
  const backend = "http://localhost:8000";

  // List of cameras + which one is selected
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Per-camera enabled/disabled (toggled in Cameras panel)
  // If a camera's value is false => treated as "off"
  const [enabledCameras, setEnabledCameras] = useState<Record<string, boolean>>(
    {}
  );

  // Camera info (from /info of the selected camera)
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

  // Only cameras that are "enabled" (toggle ON)
  const activeCameras = cameras.filter(
    (cam) => enabledCameras[cam.id] !== false
  );

  // Stream URL depends on selected *and* enabled camera
  const streamUrl =
    isStreaming &&
    selectedCameraId &&
    enabledCameras[selectedCameraId] !== false
      ? buildUrl(`/api/cameras/${selectedCameraId}/stream`)
      : "";

  const startStream = () => {
    if (!selectedCameraId || enabledCameras[selectedCameraId] === false) {
      alert("No enabled camera selected");
      return;
    }
    setIsStreaming(true);
  };

  const stopStream = () => setIsStreaming(false);
  const onStreamError = () => console.warn("Stream error.");

  // --- Load list of cameras for dropdown & panel ---
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await fetch(buildUrl("/api/cameras"));
        if (!res.ok) throw new Error("Failed to fetch cameras");
        const data: Camera[] = await res.json();
        setCameras(data);

        // Ensure each camera has an enabled state (default true)
        setEnabledCameras((prev) => {
          const next: Record<string, boolean> = { ...prev };
          data.forEach((cam) => {
            if (next[cam.id] === undefined) {
              next[cam.id] = true; // default enabled
            }
          });
          return next;
        });

        // If no camera selected yet, pick the first enabled one
        if (!selectedCameraId && data.length > 0) {
          const firstEnabled = data.find(
            (cam) => enabledCameras[cam.id] !== false
          );
          if (firstEnabled) {
            setSelectedCameraId(firstEnabled.id);
          }
        }
      } catch (err) {
        console.error("Error fetching cameras:", err);
      }
    };

    fetchCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  // --- Load camera info when selected camera changes ---
  useEffect(() => {
    if (!backend || !selectedCameraId) return;
    if (enabledCameras[selectedCameraId] === false) return;

    const fetchInfo = async () => {
      try {
        const res = await fetch(
          buildUrl(`/api/cameras/${selectedCameraId}/info`)
        );
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
  }, [backend, selectedCameraId, enabledCameras]);

  // Snapshot (for selected camera)
  const snap = useCallback(
    async () => {
      if (!selectedCameraId || enabledCameras[selectedCameraId] === false) {
        alert("No enabled camera selected");
        return;
      }

      const url = buildUrl(`/api/cameras/${selectedCameraId}/capture`);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Snapshot failed");
        const blob = await res.blob();
        const dl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dl;
        a.download = `snapshot_${selectedCameraId}_${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(dl);
      } catch (err) {
        console.error(err);
        alert("Snapshot failed.");
      }
    },
    [selectedCameraId, enabledCameras]
  );

  // Flash logic
  const levelToPwm = (level: "off" | "low" | "high") => {
    if (level === "off") return 0;
    if (level === "low") return 100;
    return 255;
  };

  const changeFlash = async (level: "off" | "low" | "high") => {
    if (!selectedCameraId || enabledCameras[selectedCameraId] === false) {
      alert("No enabled camera selected");
      return;
    }

    setFlashLevel(level);
    const pwm = levelToPwm(level);
    const url = buildUrl(`/api/cameras/${selectedCameraId}/flash?pwm=${pwm}`);
    if (!url) return alert("Backend address missing!");

    try {
      await fetch(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get label of selected camera for dropdown text
  const selectedCameraLabel =
    activeCameras.find((c) => c.id === selectedCameraId)?.label ||
    (selectedCameraId ?? "Select camera");

  // Toggle handler for Cameras panel
  const handleToggleCamera = (id: string) => {
    setEnabledCameras((prev) => {
      const currentlyEnabled = prev[id] !== false;
      const newEnabled = !currentlyEnabled;
      const updated = { ...prev, [id]: newEnabled };

      // If we just turned OFF the currently selected camera
      if (!newEnabled && selectedCameraId === id) {
        // stop streaming
        setIsStreaming(false);

        // try to pick another enabled camera
        const fallback = cameras.find(
          (cam) => cam.id !== id && updated[cam.id] !== false
        );
        setSelectedCameraId(fallback ? fallback.id : null);
      }

      // If we turned ON a camera and none is selected, select this one
      if (newEnabled && !selectedCameraId) {
        setSelectedCameraId(id);
      }

      return updated;
    });
  };

  return (
    <div className="page">
      {/* Stream Image */}
      <div className="stream">
        <div className="stream-box">
          {/* Show stream only if streaming is ON and camera is enabled */}
          {isStreaming &&
          backend &&
          selectedCameraId &&
          enabledCameras[selectedCameraId] !== false ? (
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
            {/* Camera selection dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="cameraDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {`Cameras: ${
                  activeCameras.length > 0
                    ? selectedCameraLabel
                    : "No enabled cameras"
                }`}
              </button>
              <ul className="dropdown-menu" aria-labelledby="cameraDropdown">
                {activeCameras.length === 0 && (
                  <li className="dropdown-item text-muted">
                    No enabled cameras
                  </li>
                )}

                {activeCameras.map((cam) => (
                  <li key={cam.id}>
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={() => {
                        setSelectedCameraId(cam.id);
                        // keep streaming state as-is; if isStreaming is true,
                        // img src will swap to new camera
                      }}
                    >
                      {cam.label || cam.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Display current camera information */}
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
            <button
              onClick={isStreaming ? stopStream : startStream}
              disabled={
                !selectedCameraId ||
                enabledCameras[selectedCameraId] === false ||
                activeCameras.length === 0
              }
            >
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

      {/* Cameras panel */}
      <div className="panel cameras">
        <h2>Cameras</h2>

        {cameras.length === 0 && (
          <div className="camera-item">
            <span className="text-muted">No cameras configured</span>
          </div>
        )}

        {cameras.map((cam) => {
          const isEnabled = enabledCameras[cam.id] !== false;

          return (
            <div className="camera-item" key={cam.id}>
              <img src={placeholderImg} alt="" />
              <div className="camera-info">
                <h4>{cam.label || cam.id}</h4>
                <span>{isEnabled ? "Online" : "Offline"}</span>
              </div>
              <div className="form-check form-switch large-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={`camera-toggle-${cam.id}`}
                  checked={isEnabled}
                  onChange={() => handleToggleCamera(cam.id)}
                />
              </div>
            </div>
          );
        })}
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
