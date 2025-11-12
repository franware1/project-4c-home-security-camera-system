import { useMemo, useState } from "react";

function App() {
  const [backend, setBackend] = useState<string>("http://localhost:8080");
  const streamUrl = useMemo(
    () => `${backend}/api/stream?ts=${Date.now()}`,
    [backend]
  );

  async function snap() {
    const r = await fetch(`${backend}/api/capture`);
    const b = await r.blob();
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url; a.download = "snapshot.jpg"; a.click();
    URL.revokeObjectURL(url);
  }

  async function setRes(size: string) {
    await fetch(`${backend}/api/setres?size=${encodeURIComponent(size)}`);
    // refresh stream
    const img = document.getElementById("cam") as HTMLImageElement;
    img.src = `${backend}/api/stream?ts=${Date.now()}`;
  }

  async function setFlash(v: number) {
    await fetch(`${backend}/api/flash?pwm=${v}`).catch(()=>{});
  }

  return (
    <div style={{maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, Arial"}}>
      <h3>ESP32-CAM Dashboard</h3>

      <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:12}}>
        <button onClick={snap}>Snapshot ↧</button>
        <label>Resolution:&nbsp;
          <select onChange={(e)=>setRes(e.target.value)} defaultValue="VGA">
            <option>QVGA</option><option>VGA</option><option>SVGA</option>
            <option>XGA</option><option>SXGA</option><option>UXGA</option>
          </select>
        </label>
        <label>Flash:&nbsp;
          <input type="range" min={0} max={255} defaultValue={0}
                 onInput={(e)=>setFlash(Number((e.target as HTMLInputElement).value))}/>
        </label>
        <input value={backend} onChange={e=>setBackend(e.target.value)} style={{width:340}} />
      </div>

      {/* MJPEG stream via <img> */}
      <img id="cam" src={streamUrl} alt="camera"
           style={{maxWidth:"100%", border:"1px solid #ddd", borderRadius:10}} />
    </div>
  );
}

export default App;
